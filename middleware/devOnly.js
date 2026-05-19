// =========================================
// Development-Only Guard Middleware
// =========================================
// This middleware checks TWO conditions:
//   1. The server is running in development mode (NODE_ENV)
//   2. The request body includes { mode: "development" }
// Both must be true for the request to proceed.

const devOnly = (req, res, next) => {
  const serverMode = process.env.NODE_ENV || 'production';
  const bodyMode = req.body && req.body.mode;

  if (serverMode !== 'development') {
    return res.status(403).json({
      error: 'This endpoint is only available in development mode.',
    });
  }

  if (bodyMode !== 'development') {
    return res.status(403).json({
      error: 'Invalid request. The "mode" field must be set to "development" in the request body.',
    });
  }

  next();
};

module.exports = devOnly;
