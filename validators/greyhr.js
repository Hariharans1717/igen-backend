const { z } = require('zod');
const { paginationSchema } = require('./common');

const greyhrListSchema = z.object({
  query: paginationSchema,
});

const greyhrArchiveSchema = z.object({
  body: z.object({
    candidateId: z.string().uuid(),
    companyName: z.string().trim().min(1),
    joiningDate: z.string().trim().optional(),
  }),
});

module.exports = {
  greyhrListSchema,
  greyhrArchiveSchema,
};
