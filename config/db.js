// =========================================
// PostgreSQL Connection Pool
// =========================================
const { Pool } = require('pg');

const useSSL = process.env.DB_SSL === 'true';
const sslConfig = useSSL
  ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
  : false;

const hasDbConfig = Boolean(
  process.env.DATABASE_URL ||
  (process.env.DB_HOST && process.env.DB_NAME && process.env.DB_USER)
);

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
});

// Log pool connection details
console.log('🗄️ PostgreSQL Connection Config:');
console.log('   Host:', process.env.DB_HOST || 'not configured');
console.log('   Port:', process.env.DB_PORT || 'not configured');
console.log('   Database:', process.env.DB_NAME || 'not configured');
console.log('   User:', process.env.DB_USER || 'not configured');
console.log('   Max connections:', 20);
console.log('   Connection timeout:', '30s');

// Explicit startup connection check. Awaited from server.js so the server
// only reports itself as "running" once we know whether the DB is actually
// reachable — the real error is always logged, never swallowed.
const verifyConnection = async () => {
  if (!hasDbConfig) {
    console.warn('⚠️ PostgreSQL is not configured yet. Set DATABASE_URL or DB_HOST/DB_NAME/DB_USER before using database-backed routes.');
    return false;
  }
  try {
    const result = await pool.query('SELECT NOW();');
    console.log('Database connected successfully');
    console.log('   Server time:', result.rows[0].now);
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error(err.stack);
    return false;
  }
};

// Log pool connection errors
pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle PostgreSQL client:', err.message);
  // Do not process.exit(-1) here to avoid crashing the server on Render DB connection drops
});

module.exports = pool;
module.exports.verifyConnection = verifyConnection;
