const { ZodError } = require('zod');

const formatZodErrors = (error) => error.errors.map((err) => ({
  path: err.path.join('.'),
  message: err.message,
}));

const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    req.validated = parsed;
    return next();
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: 'Validation error.', details: formatZodErrors(err) });
    }
    return next(err);
  }
};

module.exports = validate;
