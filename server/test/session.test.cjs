const assert = require('node:assert/strict');
const { test } = require('node:test');
const { randomBytes } = require('node:crypto');
process.env.SESSION_SECRET = randomBytes(32).toString('hex');
const express = require('express');
const cookieParser = require('cookie-parser');
const User = require('../models/User');
const S = require('../services/security');
const { requireAuth } = require('../middleware/auth');

test('session discovery preserves guest, bearer and cookie authentication', async () => {
  const originalLookup = User.findById;
  let lookups = 0;
  const fixture = { _id: '507f1f77bcf86cd799439011', name: 'Session fixture', role: 'customer', email: 'fixture@example.test', phone: '+918146099396' };
  User.findById = async () => { lookups++; return fixture; };
  const app = express();
  app.use(cookieParser());
  app.use('/api/auth', require('../routes/auth'));
  app.get('/private', requireAuth, (req, res) => res.json({ ok: true }));
  const server = await new Promise(resolve => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const guest = await fetch(base + '/api/auth/me');
    assert.equal(guest.status, 200); assert.deepEqual(await guest.json(), { user: null });
    assert.equal(guest.headers.get('cache-control'), 'no-store'); assert.equal(lookups, 0);
    const denied = await fetch(base + '/private'); assert.equal(denied.status, 401);
    const stale = await fetch(base + '/api/auth/me', { headers: { Authorization: 'Bearer invalid-token' } });
    assert.equal(stale.status, 200); assert.deepEqual(await stale.json(), { user: null }); assert.equal(lookups, 0);
    const token = S.mintSession(fixture._id);
    for (const headers of [{ Authorization: `Bearer ${token}` }, { Cookie: `ppl_session=${token}` }]) {
      const authenticated = await fetch(base + '/api/auth/me', { headers });
      assert.equal(authenticated.status, 200);
      const { user } = await authenticated.json(); assert.equal(user.id, fixture._id); assert.equal(user.name, fixture.name);
      assert.equal(user.passwordHash, undefined);
    }
    assert.equal(lookups, 2);
  } finally {
    User.findById = originalLookup;
    await new Promise(resolve => server.close(resolve));
  }
});
