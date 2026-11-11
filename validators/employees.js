const { z } = require('zod');
const { paginationSchema, uuidParamSchema } = require('./common');

const nullableText = z.string().trim().optional().nullable();
const nullableDate = z.preprocess(
  value => typeof value === 'string' && value.includes('T') ? value.slice(0, 10) : value,
  z.union([z.string().date(), z.literal(''), z.null()])
).optional();

const employeeBody = z.object({
  candidateId: z.string().uuid().optional().nullable(),
  employeeName: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(100).optional().nullable().or(z.literal('')),
  mobile: z.string().trim().max(20).optional().nullable(),
  companyName: z.string().trim().min(1).max(100),
  designation: nullableText,
  department: nullableText,
  joiningDate: nullableDate,
  lastWorkingDate: nullableDate,
});

const employeeListSchema = z.object({ query: paginationSchema });
const employeeCreateSchema = z.object({ body: employeeBody });
const employeeUpdateSchema = z.object({ params: uuidParamSchema, body: employeeBody });
const employeeDeleteSchema = z.object({ params: uuidParamSchema });

module.exports = { employeeListSchema, employeeCreateSchema, employeeUpdateSchema, employeeDeleteSchema };