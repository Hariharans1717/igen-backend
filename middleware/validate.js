const { ZodError } = require('zod');

const formatZodErrors = (error) => error.errors.map((err) => ({
  path: err.path.join('.'),
  message: err.message,
}));

const validate = (schema) => (req, res, next) => {
  try {
    console.log(`🔍 [Validation] ${req.method} ${req.path}`);
    console.log('   Request body:', JSON.stringify(req.body, null, 2));
    console.log('   Request query:', JSON.stringify(req.query, null, 2));
    
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    
    console.log('✅ [Validation] Passed');
    req.validated = parsed;
    return next();
  } catch (err) {
    if (err instanceof ZodError) {
      console.error('❌ [Validation] Failed:', formatZodErrors(err));
      return res.status(400).json({ error: 'Validation error.', details: formatZodErrors(err) });
    }
    return next(err);
  }
};

module.exports = validate;
