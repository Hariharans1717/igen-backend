const pool = require('../config/db');
const { comparePassword, hashPassword, validatePasswordStrength } = require('../utils/password');
const {
  createAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  getRefreshTokenExpiry,
} = require('../utils/tokens');

const mapUserRow = (row) => ({
  id: row.id,
  name: `${row.first_name} ${row.last_name}`,
  email: row.email,
  role: row.role,
  isActive: row.is_active,
  createdAt: row.created_at,
  avatar: '',
});

const getUserByEmail = async (email) => {
  const result = await pool.query('SELECT * FROM hr_users WHERE email = $1', [email]);
  return result.rows[0] || null;
};

const getUserById = async (id) => {
  const result = await pool.query('SELECT * FROM hr_users WHERE id = $1', [id]);
  return result.rows[0] || null;
};

const createUser = async ({ firstName, lastName, email, mobile, password, role }) => {
  const passwordCheck = validatePasswordStrength(password);
  if (!passwordCheck.valid) {
    const error = new Error(passwordCheck.message);
    error.status = 400;
    throw error;
  }

  const existing = await pool.query('SELECT id FROM hr_users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    const error = new Error('A user with this email already exists.');
    error.status = 409;
    throw error;
  }

  const passwordHash = await hashPassword(password);
  const result = await pool.query(
    `INSERT INTO hr_users (first_name, last_name, email, mobile, password_hash, role, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, true)
     RETURNING *`,
    [firstName, lastName, email, mobile || null, passwordHash, role || 'recruiter']
  );

  return result.rows[0];
};

const updateLastLogin = async (id) => {
  await pool.query('UPDATE hr_users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [id]);
};

const createSessionTokens = async ({ userId, email, role, userAgent, ipAddress }) => {
  const accessToken = createAccessToken({ id: userId, email, role });
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const expiresAt = getRefreshTokenExpiry();

  await pool.query(
    `INSERT INTO auth_refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, refreshTokenHash, expiresAt, userAgent || null, ipAddress || null]
  );

  return { accessToken, refreshToken, refreshTokenExpiresAt: expiresAt };
};

const revokeRefreshToken = async (refreshToken) => {
  const tokenHash = hashRefreshToken(refreshToken);
  await pool.query(
    'UPDATE auth_refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = $1',
    [tokenHash]
  );
};

const findRefreshToken = async (refreshToken) => {
  const tokenHash = hashRefreshToken(refreshToken);
  const result = await pool.query(
    'SELECT * FROM auth_refresh_tokens WHERE token_hash = $1',
    [tokenHash]
  );
  return result.rows[0] || null;
};

const rotateRefreshToken = async ({ refreshToken, userId, email, role, userAgent, ipAddress }) => {
  await revokeRefreshToken(refreshToken);
  return createSessionTokens({ userId, email, role, userAgent, ipAddress });
};

const verifyPassword = async (password, hash) => comparePassword(password, hash);

const updatePassword = async (userId, passwordHash) => {
  await pool.query('UPDATE hr_users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
};

module.exports = {
  mapUserRow,
  getUserByEmail,
  getUserById,
  createUser,
  updateLastLogin,
  createSessionTokens,
  revokeRefreshToken,
  findRefreshToken,
  rotateRefreshToken,
  verifyPassword,
  updatePassword,
};
