const { z } = require('zod');
const { SUBMISSION_STATUSES } = require('../utils/enums');
const { paginationSchema, candidateIdParamSchema } = require('./common');

const submissionCreateSchema = z.object({
  body: z.object({
    candidateId: z.string().uuid(),
    companyName: z.string().trim().min(1),
    submissionDate: z.string().trim().optional(),
    status: z.enum(SUBMISSION_STATUSES).optional(),
    offerCTC: z.coerce.number().nonnegative().optional(),
    joiningDate: z.string().trim().optional(),
    notes: z.string().trim().optional(),
  }),
});

const submissionUpdateSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    companyName: z.string().trim().min(1).optional(),
    submissionDate: z.string().trim().optional(),
    status: z.enum(SUBMISSION_STATUSES).optional(),
    offerCTC: z.coerce.number().nonnegative().optional().nullable(),
    joiningDate: z.string().trim().optional().nullable(),
    notes: z.string().trim().optional().nullable(),
  }),
});

const submissionListSchema = z.object({
  query: paginationSchema,
});

const submissionDuplicateSchema = z.object({
  body: z.object({
    candidateId: z.string().uuid(),
    companyName: z.string().trim().min(1),
  }),
});

const submissionByCandidateSchema = z.object({
  params: candidateIdParamSchema,
});

module.exports = {
  submissionCreateSchema,
  submissionUpdateSchema,
  submissionListSchema,
  submissionDuplicateSchema,
  submissionByCandidateSchema,
};
