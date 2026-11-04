import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';

// Use the real session route for local browser/audit checks, without starting
// MongoDB or the production app. Anonymous probes do not query the database.
export async function startLocalSessionServer({ products } = {}) {
  process.env.SESSION_SECRET ||= randomBytes(32).toString('hex');
  const require = createRequire(new URL('../../server/package.json', import.meta.url));
  const express = require('express');
  const cookieParser = require('cookie-parser');
  const app = express();
  app.use(cookieParser());
  app.use('/api/auth', require('./routes/auth.js'));
  // Optional read-only fixture for browser catalogue/navigation checks.
  if (products) app.get('/api/services/public', (req, res) => res.json({ products, shop: {} }));
  const server = await new Promise(resolve => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  return {
    target: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise(resolve => server.close(resolve)),
  };
}
