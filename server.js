// =========================================
// iGEN Talent Acquisition — Backend Server
// Trigger Render Deployment: Companies & Candidate Schema
// =========================================
const fs = require('fs');
const path = require('path');

const envCandidates = [
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, '../I-GEN/.env'),
  path.resolve(__dirname, '../.env'),
];

for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    console.log(`📄 Loaded environment variables from ${path.relative(process.cwd(), envPath)}`);
    break;
  }
}

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
    version: '1.0.6-company-fix',
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

// ---- Serve Frontend Build & SPA Fallback ----
const frontendDistPath = path.join(__dirname, '../Talent-Acquisition-iGEN/dist');
if (require('fs').existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// ---- 404 Handler ----
app.use((req, res) => {
  if (req.accepts('html') && !req.originalUrl.startsWith('/api')) {
    return res.redirect('/');
  }
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

const startServer = (port) => {
  const server = app.listen(port, () => {
    printStartupBanner(port);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${port} is already in use. Free it and restart — the server will not fall back to another port.`);
      process.exit(1);
    }

    console.error('❌ Server startup failed:', err.message);
    process.exit(1);
  });
};

startServer(BASE_PORT);

module.exports = app;
