// =========================================
// iGEN Talent Acquisition — Backend Server
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

if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// ---- Environment ----
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'production';

// ---- CORS Configuration ----
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
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

// ---- Health Check ----
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
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║                                                  ║
║   🚀 iGEN Backend Server                        ║
║                                                  ║
║   Port:        ${String(PORT).padEnd(33)}║
║   Environment: ${NODE_ENV.padEnd(33)}║
║   CORS Origin: ${(process.env.CORS_ORIGIN || 'http://localhost:5173').padEnd(33)}║
║                                                  ║
║   Admin Registration: ${(NODE_ENV === 'development' ? '✅ ENABLED' : '🔒 DISABLED').padEnd(26)}║
║                                                  ║
╚══════════════════════════════════════════════════╝
  `);
});

module.exports = app;
