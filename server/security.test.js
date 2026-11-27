const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes, randomUUID } = require('node:crypto');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');

const port = process.env.NUTRISCAN_AUDIT_MONGO_PORT;
const headers = { 'Content-Type': 'application/json' };

test('supported app security flows on a disposable local MongoDB replica set', { skip: !port }, async t => {
  assert.match(port, /^\d{4,5}$/);
  const database = 'nutriscan_audit_' + randomBytes(8).toString('hex');
  process.env.JWT_SECRET = randomBytes(32).toString('hex');
  process.env.RESEND_API_KEY = 'local-fake-key';
  process.env.ACCOUNT_EMAIL_FROM = 'security@example.test';
  process.env.GEMINI_API_KEY = 'local-fake-provider';
  const app = require('./app');
  const User = require('./models/User');
  const { RateBucket, limit } = require('./security');
  const photo = readFileSync(path.join(__dirname, '../client/src/assets/meal-bowl.webp'));

  await mongoose.connect('mongodb://127.0.0.1:' + port + '/' + database, { serverSelectionTimeoutMS: 5000 });
  t.after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));

  const nativeFetch = global.fetch;
  const codes = new Map();
  let providerCalls = 0;
  let releaseMockScan;
  let notifyScanStarted;
  const providerStarted = new Promise(resolve => { notifyScanStarted = resolve; });
  global.fetch = async (url, options) => {
    if (String(url) === 'https://api.resend.com/emails') {
      const { to, text } = JSON.parse(options.body);
      codes.set(to[0], /:\s(\d{8})\./.exec(text)[1]);
      return new Response('{}', { status: 200 });
    }
    if (String(url).startsWith('https://generativelanguage.googleapis.com/')) {
      providerCalls++;
      await new Promise(resolve => { releaseMockScan = resolve; notifyScanStarted(); });
      const estimate = { status: 'ready', title: 'Rice', foods: [{ question: '', options: [{
        name: 'Rice', label: 'Serving', grams: 100, calories: 120,
        protein: 2, carbs: 25, fat: 1, fiber: 1, sugar: 0, sodium: 2,
      }] }] };
      return Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(estimate) }] } }] });
    }
    throw new Error('Test disabled external fetch');
  };
  t.after(() => { global.fetch = nativeFetch; });

  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));

  async function request(apiPath, method = 'GET', body, token) {
    const binary = Buffer.isBuffer(body);
    const response = await nativeFetch('http://127.0.0.1:' + server.address().port + '/api' + apiPath, {
      method,
      headers: { ...(binary ? { 'Content-Type': 'application/octet-stream' } : headers),
        ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: body === undefined || binary ? body : JSON.stringify(body),
    });
    const json = response.headers.get('content-type')?.includes('application/json') ? await response.json() : null;
    return { status: response.status, json, headers: response.headers };
  }

  const password = 'Synthetic password 123';
  const email = 'case-a@example.test';
  const details = { email, password, first_name: 'Audit', last_name: 'Example', date_of_birth: '1999-01-01' };
  const missingCode = await request('/auth/register', 'POST', details);
  assert.equal(missingCode.status, 400);
  assert.equal(await User.countDocuments(), 0);
  assert.equal((await request('/auth/register/code', 'POST', { email })).status, 202);
  const signup = await request('/auth/register', 'POST', { ...details, code: codes.get(email) });
  assert.equal(signup.status, 201);
  assert.equal((await request('/auth/register', 'POST', { ...details, code: codes.get(email) })).status, 400);
  assert.equal((await request('/users/me', 'GET', undefined, signup.json.token)).json.requires_password, true);
  assert.equal((await request('/users/me', 'GET', undefined, signup.json.token)).json.password, undefined);
  assert.equal((await request('/users/me', 'GET', undefined, signup.json.token)).json._id, undefined);
  assert.equal((await request('/auth/logout', 'POST', {}, signup.json.token)).status, 204);
  assert.equal((await request('/users/me', 'GET', undefined, signup.json.token)).status, 401);

  const otherEmail = 'case-b@example.test';
  assert.equal((await request('/auth/register/code', 'POST', { email: otherEmail })).status, 202);
  const other = await request('/auth/register', 'POST', { ...details, email: otherEmail, code: codes.get(otherEmail) });
  assert.equal(other.status, 201);

  const legacy = require('jsonwebtoken').sign({ userId: signup.json.user.user_id }, process.env.JWT_SECRET, { expiresIn: '15m' });
  assert.equal((await request('/users/me', 'GET', undefined, legacy)).status, 200);
  const prior = await request('/auth/login', 'POST', { email, password });
  assert.equal(prior.status, 200);
  assert.equal((await request('/auth/password-reset/code', 'POST', { email })).status, 202);
  const updatedPassword = 'Different synthetic password 456';
  assert.equal((await request('/auth/password-reset', 'POST', { email, password: updatedPassword, code: codes.get(email) })).status, 204);
  assert.equal((await request('/users/me', 'GET', undefined, prior.json.token)).status, 401);
  assert.equal((await request('/users/me', 'GET', undefined, legacy)).status, 401);
  const loggedIn = await request('/auth/login', 'POST', { email, password: updatedPassword });
  const token = loggedIn.json.token;
  assert.equal(loggedIn.status, 200);

  const item = { product_name: 'Test cereal', brand: 'Test brand', category: 'Test breakfast', serving_size: '100g',
    calories: '100', fat: '2', sugar: '3', sodium: '25', protein: '5' };
  const product = await request('/food-products', 'POST', item, token);
  assert.equal(product.status, 201);
  assert.equal(product.json.nutrition.calories, 100);
  assert.equal(product.json._id, undefined);
  assert.equal((await request('/food-products', 'POST', { ...item, product_name: 'Test flakes' }, token)).status, 201);
  const firstPage = await request('/food-products?limit=1', 'GET', undefined, token);
  assert.equal(firstPage.json.length, 1);
  assert.equal(firstPage.headers.get('X-Next-Offset'), '1');
  const nutritionWrite = t.mock.method(mongoose.model('NutritionDetails').prototype, 'save',
    async () => { throw new Error('Test forces the second catalog write to fail'); });
  try {
    assert.equal((await request('/food-products', 'POST', { ...item, product_name: 'Never stored' }, token)).status, 500);
    assert.equal(await mongoose.model('FoodProduct').countDocuments(), 2);
  } finally {
    nutritionWrite.mock.restore();
  }

  assert.equal((await request('/health-profiles', 'PUT', { weight: 75, height: 180, lifestyle_type: 'Active' }, token)).status, 200);
  const date = '2026-11-27';
  const manual = await request('/consumption', 'POST', { product_id: product.json.product_id, quantity: '2', date, time: '12:00' }, token);
  assert.equal(manual.status, 201);
  const intake = await request('/daily-intake?date=' + date, 'GET', undefined, token);
  assert.equal(intake.json[0].total_calories, 200);
  assert.deepEqual((await request('/consumption', 'GET', undefined, other.json.token)).json, []);

  const uploaded = await request('/meal-photos', 'POST', photo, token);
  assert.equal(uploaded.status, 201);
  assert.match(uploaded.json.id, /^[0-9a-f-]{36}$/);
  assert.equal((await request('/meal-photos/' + uploaded.json.id, 'GET', undefined, other.json.token)).status, 404);
  assert.equal((await request('/meal-photos/' + uploaded.json.id, 'GET', undefined, token)).status, 200);
  assert.equal((await request('/meal-photos', 'POST', photo, token)).json.id, uploaded.json.id);
  const stored = await mongoose.model('MealPhoto').findOne({ public_id: uploaded.json.id }).select('_id');
  assert.equal((await request('/meal-photos/' + stored.id, 'GET', undefined, token)).status, 200);

  const logged = await request('/consumption/meal', 'POST', { id: randomUUID(), title: 'Audit meal', date,
    time: '13:00', photoId: uploaded.json.id, saveToLibrary: true,
    items: [{ name: 'Example', grams: 50, calories: 50, protein: 3, carbs: 8, fat: 1, fiber: 1, sugar: 0, sodium: 4 }],
  }, token);
  assert.equal(logged.status, 201);
  assert.equal(logged.json.photo_id, uploaded.json.id);
  const [saved] = (await request('/saved-foods', 'GET', undefined, token)).json;
  assert.match(saved._id, /^[0-9a-f-]{36}$/);
  assert.equal((await request('/saved-foods/' + saved._id, 'GET', undefined, token)).status, 200);

  const payload = { photo: 'data:image/webp;base64,' + photo.toString('base64') };
  const activeScan = request('/meal-scan', 'POST', payload, token);
  try {
    const began = await Promise.race([providerStarted.then(() => true), activeScan.then(() => false)]);
    assert.equal(began, true);
    assert.equal((await request('/meal-scan', 'POST', payload, token)).status, 429);
  } finally {
    releaseMockScan?.();
  }
  assert.equal((await activeScan).status, 200);
  assert.equal(providerCalls, 1);

  const enforce = limit('test.budget', { account: 2, seconds: 900 });
  const dummyRequest = { user: { userId: 'local-audit-budget' } };
  const observe = async () => {
    let status = 200;
    const response = { set() { return this; }, status(value) { status = value; return this; }, json() {} };
    await enforce(dummyRequest, response, () => {});
    return status;
  };
  assert.deepEqual((await Promise.all([observe(), observe(), observe()])).sort(), [200, 200, 429]);
  assert.equal(await RateBucket.countDocuments() > 0, true);

  assert.equal((await request('/users/me', 'DELETE', { confirmation: 'DELETE', password: 'incorrect' }, token)).status, 403);
  const savedDelete = t.mock.method(mongoose.model('SavedFood'), 'deleteMany',
    async () => { throw new Error('Test forces a mid-transaction deletion failure'); });
  try {
    assert.equal((await request('/users/me', 'DELETE', { confirmation: 'DELETE', password: updatedPassword }, token)).status, 500);
    assert.equal((await request('/health-profiles', 'GET', undefined, token)).json.weight, 75);
  } finally {
    savedDelete.mock.restore();
  }
  assert.equal((await request('/users/me', 'DELETE', { confirmation: 'DELETE', password: updatedPassword }, token)).status, 204);
  assert.equal((await request('/users/me', 'GET', undefined, token)).status, 401);
  assert.equal((await request('/users/me', 'GET', undefined, other.json.token)).status, 200);
  for (const name of ['HealthProfile', 'MealPhoto', 'ConsumptionRecord', 'DailyIntake', 'SavedFood', 'Alert']) {
    assert.equal(await mongoose.model(name).countDocuments({ user_id: signup.json.user.user_id }), 0);
  }
  assert.equal(await mongoose.model('FoodProduct').countDocuments(), 2);
});
