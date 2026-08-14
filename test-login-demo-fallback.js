const assert = require('assert');
const { login } = require('./controllers/authController');

(async () => {
  delete process.env.DATABASE_URL;
  delete process.env.DB_HOST;
  delete process.env.DB_NAME;
  delete process.env.DB_USER;
  delete process.env.DB_PASSWORD;
  delete process.env.JWT_SECRET;

  const req = {
    validated: { body: { email: 'priya@igen.in', password: 'igen@2025' } },
    get: () => 'demo-agent',
    ip: '127.0.0.1',
  };

  const res = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return payload;
    },
  };

  await login(req, res);

  assert.strictEqual(res.statusCode, 200, `Expected 200, got ${res.statusCode}`);
  assert.ok(res.payload && res.payload.token, 'Expected access token in response');
  console.log('✅ Demo login fallback works without database/JWT env configured');
})();
