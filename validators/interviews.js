const { z } = require('zod');
const { INTERVIEW_RESULTS, INTERVIEW_MODES } = require('../utils/enums');
const { paginationSchema, candidateIdParamSchema } = require('./common');

const interviewCreateSchema = z.object({
  body: z.object({
    candidate_id: z.union([z.string(), z.number()]).optional(),
    title: z.string().optional(),
    interview_date: z.string().optional(),
    interview_time: z.string().optional(),
    interview_type: z.string().optional(),
    interviewer_name: z.string().optional(),
    candidate_name: z.string().optional(),
    role: z.string().optional(),
    department: z.string().optional(),
    notes: z.string().optional(),
    
    submissionId: z.string().uuid().optional(),
    interviewDate: z.string().trim().optional(),
    round: z.string().trim().optional(),
    mode: z.enum(INTERVIEW_MODES).optional(),
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
    status: z.string().optional(),
    
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
