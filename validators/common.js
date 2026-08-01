const { z } = require('zod');

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(10000).default(20),
  search: z.string().trim().optional(),
  sortBy: z.string().trim().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

const candidateIdParamSchema = z.object({
  candidateId: z.string().uuid(),
});

module.exports = {
  paginationSchema,
  uuidParamSchema,
  candidateIdParamSchema,
};
