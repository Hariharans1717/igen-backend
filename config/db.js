// =========================================
// PostgreSQL Connection Pool
// =========================================
const { Pool } = require('pg');

const useSSL = process.env.DB_SSL === 'true';
const sslConfig = useSSL
  ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
  : undefined;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  host: process.env.DATABASE_URL ? undefined : process.env.DB_HOST,
  port: process.env.DATABASE_URL ? undefined : parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DATABASE_URL ? undefined : process.env.DB_NAME,
  user: process.env.DATABASE_URL ? undefined : process.env.DB_USER,
  password: process.env.DATABASE_URL ? undefined : process.env.DB_PASSWORD,
  ssl: sslConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
  ssl: {
    rejectUnauthorized: false
  }
});

// Log pool connection errors
pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle PostgreSQL client:', err.message);
  // Do not process.exit(-1) here to avoid crashing the server on Render DB connection drops
});

module.exports = pool;
