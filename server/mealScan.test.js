const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('./models/User');
const { RevokedSession, RateBucket } = require('./security');
const { parseMealScan } = require('./mealScanResult');

const option = { label: 'One serving', name: 'Rice', grams: 150, calories: 195,
  protein: 4, carbs: 42, fat: 0.5, fiber: 1, sugar: 0, sodium: 2 };
const ready = { status: 'ready', title: 'Rice bowl', reason: '',
  foods: [{ question: 'How much rice?', options: [option] }] };
const gemini = (scan, finishReason = 'STOP') => ({ candidates: [{ finishReason,
  content: { parts: [{ text: JSON.stringify(scan) }] } }] });

test('meal scan response recovery and failure handling', async t => {
  process.env.JWT_SECRET = 'meal-scan-test-secret';
  process.env.GEMINI_API_KEY = 'test-key';
  const nativeFetch = global.fetch;
  t.mock.method(User, 'findOne', () => ({ select: () => ({ lean: async () => ({ sessionVersion: 0 }) }) }));
  t.mock.method(RevokedSession, 'exists', async () => null);
  t.mock.method(RateBucket, 'findOneAndUpdate', async () => ({ count: 1 }));
  const ScanLease = mongoose.model('ScanLease');
  t.mock.method(ScanLease, 'updateOne', async () => ({ acknowledged: true }));
  t.mock.method(ScanLease, 'deleteOne', async () => ({ acknowledged: true }));
  const photo = 'data:image/webp;base64,' + require('node:fs').readFileSync(
    require('node:path').join(__dirname, '../client/src/assets/meal-bowl.webp')
  ).toString('base64');
  const app = express();
  app.use('/scan', require('./routes/mealScan'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/scan`;
  let responses, calls;
  global.fetch = async () => {
    calls += 1;
    const { body, status = 200 } = responses.shift();
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  };
  async function scan(queue, authorized = true) {
    responses = [...queue]; calls = 0;
    const response = await nativeFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json',
      ...(authorized ? { Authorization: 'Bearer ' + jwt.sign({ userId: 'test' }, process.env.JWT_SECRET, { expiresIn: '15m' }) } : {}) },
    body: JSON.stringify({ photo }) });
    return { status: response.status, body: await response.json() };
  }
  try {
    await t.test('single-option question preserves valid nutrition and skips unnecessary question', async () => {
      const result = await scan([{ body: gemini(ready) }]);
      assert.equal(result.status, 200);
      assert.equal(result.body.foods[0].question, '');
      assert.deepEqual(result.body.foods[0].options[0], option);
      assert.equal(calls, 1);
    });
    await t.test('invalid estimate retries once and recovers', async () => {
      const result = await scan([{ body: gemini({ ...ready, foods: [] }) }, { body: gemini(ready) }]);
      assert.equal(result.status, 200); assert.equal(calls, 2);
    });
    await t.test('malformed and truncated outputs fail after two attempts', async () => {
      const result = await scan([{ body: { candidates: [{ content: { parts: [{ text: '{' }] } }] } },
        { body: gemini(ready, 'MAX_TOKENS') }]);
      assert.equal(result.status, 502); assert.equal(calls, 2);
    });
    await t.test('temporary provider failure retries and recovers', async () => {
      const result = await scan([{ status: 503, body: {} }, { body: gemini(ready) }]);
      assert.equal(result.status, 200); assert.equal(calls, 2);
    });
    await t.test('quota errors and blocked photos are not retried', async () => {
      let result = await scan([{ status: 429, body: { error: { message: 'Quota exceeded' } } }]);
      assert.equal(result.status, 503); assert.equal(calls, 1);
      result = await scan([{ body: { promptFeedback: { blockReason: 'SAFETY' } } }]);
      assert.equal(result.status, 422); assert.equal(calls, 1);
    });
    await t.test('authentication remains required', async () => {
      const result = await scan([], false);
      assert.equal(result.status, 401); assert.equal(calls, 0);
    });
    await t.test('malformed fields and negative nutrients are rejected, retake is preserved', () => {
      for (const bad of [null, { ...ready, foods: [null] }, { ...ready, title: null },
        { ...ready, foods: [{ question: '', options: [{ ...option, calories: -1 }] }] }]) {
        assert.throws(() => parseMealScan(JSON.stringify(bad)), { name: 'InvalidMealScan' });
      }
      assert.deepEqual(parseMealScan(JSON.stringify({ status: 'retake', reason: 'Photo is blurry' })),
        { status: 'retake', reason: 'Photo is blurry' });
    });
  } finally {
    global.fetch = nativeFetch;
    await new Promise(resolve => server.close(resolve));
  }
});
