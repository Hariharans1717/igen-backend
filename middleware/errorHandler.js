const { ZodError } = require('zod');

const errorHandler = (err, req, res, next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation error.',
      details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    });
  }

  const status = err.status || 500;
  const message = err.message || 'Internal server error.';
  if (status >= 500) {
    console.error('Unhandled error:', err);
  }
  return res.status(status).json({ error: message });
};

module.exports = errorHandler;
