const { ZodError } = require('zod');

const errorHandler = (err, req, res, next) => {
  console.error('🚨 [Error Handler] Caught error:');
  console.error('   Type:', err.constructor.name);
  console.error('   Message:', err.message);
  console.error('   Path:', req.path);
  console.error('   Method:', req.method);
  
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({ path: e.path.join('.'), message: e.message }));
    console.error('   Validation details:', JSON.stringify(formattedErrors, null, 2));
    return res.status(400).json({
      error: 'Validation error.',
      details: formattedErrors,
    });
  }

  const status = err.status || 500;
  const message = err.message || 'Internal server error.';
  
  if (status >= 500) {
    console.error('❌ [Error Handler] Unhandled server error:', err);
    console.error('   Stack:', err.stack);
  }
  
  return res.status(status).json({ error: message });
};

module.exports = errorHandler;
