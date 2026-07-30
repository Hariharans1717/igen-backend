// =========================================
// iGEN Talent Acquisition — Backend Server
// Trigger Render Deployment: Companies & Candidate Schema
// =========================================
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const { apiLimiter } = require('./middleware/rateLimit');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.set('trust proxy', 1);

// ---- Environment ----
const BASE_PORT = Number(process.env.PORT) || 5000;
const NODE_ENV = process.env.NODE_ENV || 'production';

// ---- CORS Configuration ----
const corsOptions = {
  origin: true, // Automatically reflects request origin to support all origins with credentials
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Access-Token'],
  credentials: true,
};

app.use(cors(corsOptions));

// ---- Security Headers ----
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// ---- Body Parsing ----
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ---- Logging ----
app.use(morgan(NODE_ENV === 'development' ? 'dev' : 'combined'));

// ---- Rate Limiting ----
app.use('/api', apiLimiter);

// ---- Root & Health Check ----
app.get('/', (req, res) => {
  res.json({
    message: '🚀 iGEN Talent Acquisition Backend API is running!',
    version: '1.0.5-companies-active',
    status: 'ok',
    health: '/api/health',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ---- Route Mounting ----
const authRoutes = require('./routes/auth');
const candidateRoutes = require('./routes/candidates');
const submissionRoutes = require('./routes/submissions');
const interviewRoutes = require('./routes/interviews');
const timelineRoutes = require('./routes/timeline');
const notesRoutes = require('./routes/notes');
const notificationRoutes = require('./routes/notifications');
const greyhrRoutes = require('./routes/greyhr');
const dashboardRoutes = require('./routes/dashboard');
const userRoutes = require('./routes/users');
const companyRoutes = require('./routes/companies');

app.use('/api/auth', authRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/timeline', timelineRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/greyhr', greyhrRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/companies', companyRoutes);

console.log('📋 Routes Registered:');
console.log('   ✅ POST   /api/candidates');
console.log('   ✅ GET    /api/candidates');
console.log('   ✅ GET    /api/candidates/:id');
console.log('   ✅ PUT    /api/candidates/:id');
console.log('   ✅ DELETE /api/candidates/:id');
console.log('   ✅ POST   /api/candidates/check-duplicate');

// ---- 404 Handler ----
app.use((req, res) => {
  console.warn(`⚠️ 404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found.` });
});

// ---- Global Error Handler ----
app.use(errorHandler);

// ---- Start Server ----
const printStartupBanner = (port) => {
  console.log(`
╔══════════════════════════════════════════════════╗
║                                                  ║
║   🚀 iGEN Backend Server                        ║
║                                                  ║
║   Port:        ${String(port).padEnd(33)}║
║   Environment: ${NODE_ENV.padEnd(33)}║
║   CORS Origin: ${(process.env.CORS_ORIGIN || 'http://localhost:5173').padEnd(33)}║
║                                                  ║
║   Admin Registration: ${(NODE_ENV === 'development' ? '✅ ENABLED' : '🔒 DISABLED').padEnd(26)}║
║                                                  ║
╚══════════════════════════════════════════════════╝
  `);
};

const startServer = (port, retriesLeft = 5) => {
  const server = app.listen(port, () => {
    printStartupBanner(port);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && retriesLeft > 0) {
      const nextPort = port + 1;
      console.warn(`⚠️ Port ${port} is in use. Retrying on port ${nextPort}...`);
      return startServer(nextPort, retriesLeft - 1);
    }

    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Could not start server: ports ${BASE_PORT}-${BASE_PORT + 5} are in use.`);
      process.exit(1);
    }

    console.error('❌ Server startup failed:', err.message);
    process.exit(1);
  });
};

startServer(BASE_PORT);

module.exports = app;
