// =========================================
// Auth Routes — Login & Admin Registration
// =========================================
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const devOnly = require('../middleware/devOnly');

const router = express.Router();

// ---- POST /api/auth/login ----
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Find user by email
    const result = await pool.query(
      'SELECT * FROM hr_users WHERE email = $1 AND is_active = true',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = result.rows[0];

    // Compare password with hash
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Update last_login
    await pool.query(
      'UPDATE hr_users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Return user data (matching frontend HRUser shape)
    res.json({
      user: {
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        role: user.role,
        isActive: user.is_active,
        createdAt: user.created_at,
        avatar: '',
      },
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ---- POST /api/auth/register-admin ----
// Protected by devOnly middleware: only works in development mode
// AND when body includes { mode: "development" }
router.post('/register-admin', devOnly, async (req, res) => {
  try {
    const { firstName, lastName, email, mobile, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        error: 'firstName, lastName, email, and password are required.',
      });
    }

    // Check if email already exists
    const existing = await pool.query(
      'SELECT id FROM hr_users WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert admin user
    const result = await pool.query(
      `INSERT INTO hr_users (first_name, last_name, email, mobile, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, $5, 'admin', true)
       RETURNING *`,
      [firstName, lastName, email, mobile || null, passwordHash]
    );

    const user = result.rows[0];

    res.status(201).json({
      message: 'Admin user created successfully.',
      user: {
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        role: user.role,
        isActive: user.is_active,
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    console.error('Register admin error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
