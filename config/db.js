// =========================================
// PostgreSQL Connection Pool
// =========================================
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: {
    rejectUnauthorized: false
  }
});

// Log pool connection errors
pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle PostgreSQL client:', err);
  process.exit(-1);
});

module.exports = pool;
