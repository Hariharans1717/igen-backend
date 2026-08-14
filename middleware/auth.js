// =========================================
// JWT Authentication Middleware
// =========================================
const jwt = require('jsonwebtoken');

const DEFAULT_JWT_SECRET = 'igen-dev-secret-key-2026';
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  const token = bearerToken || req.headers['x-access-token'];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email, role }
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

module.exports = authenticate;
