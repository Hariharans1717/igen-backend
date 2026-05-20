const { z } = require('zod');
const { INTERVIEW_RESULTS, INTERVIEW_MODES } = require('../utils/enums');
const { paginationSchema, candidateIdParamSchema } = require('./common');

const interviewCreateSchema = z.object({
  body: z.object({
    submissionId: z.string().uuid(),
    interviewDate: z.string().trim().min(1),
    round: z.string().trim().min(1),
    mode: z.enum(INTERVIEW_MODES),
    feedback: z.string().trim().optional(),
    result: z.enum(INTERVIEW_RESULTS).optional(),
    offeredCTC: z.coerce.number().nonnegative().optional(),
    offerStatus: z.string().trim().optional(),
    joiningDate: z.string().trim().optional(),
    recruiterNotes: z.string().trim().optional(),
  }),
});

const interviewUpdateSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    interviewDate: z.string().trim().optional(),
    round: z.string().trim().optional(),
    mode: z.enum(INTERVIEW_MODES).optional(),
    feedback: z.string().trim().optional().nullable(),
    result: z.enum(INTERVIEW_RESULTS).optional(),
    offeredCTC: z.coerce.number().nonnegative().optional().nullable(),
    offerStatus: z.string().trim().optional().nullable(),
    joiningDate: z.string().trim().optional().nullable(),
    recruiterNotes: z.string().trim().optional().nullable(),
  }),
});

const interviewListSchema = z.object({
  query: paginationSchema,
});

const interviewByCandidateSchema = z.object({
  params: candidateIdParamSchema,
});

module.exports = {
  interviewCreateSchema,
  interviewUpdateSchema,
  interviewListSchema,
  interviewByCandidateSchema,
};
