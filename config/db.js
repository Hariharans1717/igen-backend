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

if (!hasDbConfig) {
  console.warn('⚠️ PostgreSQL is not configured yet. Set DATABASE_URL or DB_HOST/DB_NAME/DB_USER before using database-backed routes.');
} else {
  // Test connection
  pool.query('SELECT NOW();', (err, result) => {
    if (err) {
      console.error('❌ PostgreSQL connection test failed:', err.message);
    } else {
      console.log('✅ PostgreSQL connection successful');
      console.log('   Server time:', result.rows[0].now);
    }
  });
}

// Log pool connection errors
pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle PostgreSQL client:', err.message);
  // Do not process.exit(-1) here to avoid crashing the server on Render DB connection drops
});

module.exports = pool;
