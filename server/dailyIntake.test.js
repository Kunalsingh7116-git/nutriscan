const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const DailyIntake = require('./models/DailyIntake');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const { RevokedSession } = require('./security');
process.env.JWT_SECRET = 'range-test-secret';
test('dashboard date ranges remain user-scoped and bounded', async t => {
  t.mock.method(User, 'findOne', () => ({ select: () => ({ lean: async () => ({ sessionVersion: 0 }) }) }));
  t.mock.method(RevokedSession, 'exists', async () => null);
  const oldFind = DailyIntake.find;
  let filter;
  DailyIntake.find = value => {
    filter = value;
    const query = { select: () => query, sort: () => query, skip: () => query, limit: () => query, lean: async () => [] };
    return query;
  };
  const app = express(); app.use('/intake', require('./routes/dailyIntake'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/intake`;
  const headers = { Authorization: `Bearer ${jwt.sign({ userId: 'scoped-user' }, process.env.JWT_SECRET, { expiresIn: '15m' })}` };
  try {
    let response = await fetch(base + '?from=2026-11-21&to=2026-11-27', { headers });
    assert.equal(response.status, 200);
    assert.deepEqual(filter, { user_id: 'scoped-user', date: { $gte: '2026-11-21', $lte: '2026-11-27' } });
    response = await fetch(base + '?from=2026-11-28&to=2026-11-27', { headers });
    assert.equal(response.status, 400);
    response = await fetch(base + '?from=2026-11-21', { headers });
    assert.equal(response.status, 400);
    response = await fetch(base + '?date=2026-11-27', { headers });
    assert.equal(response.status, 200);
    assert.deepEqual(filter, { user_id: 'scoped-user', date: '2026-11-27' });
    response = await fetch(base);
    assert.equal(response.status, 401);
  } finally { DailyIntake.find = oldFind; server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
