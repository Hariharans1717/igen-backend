const { z } = require('zod');
const { INTERVIEW_RESULTS, INTERVIEW_MODES } = require('../utils/enums');
const { paginationSchema, candidateIdParamSchema } = require('./common');

const interviewCreateSchema = z.object({
  body: z.object({
    candidate_id: z.union([z.string(), z.number()]).optional(),
    companyId: z.string().uuid().optional().nullable(),
    company_id: z.string().uuid().optional().nullable(),
    branchId: z.string().uuid().optional().nullable(),
    branch_id: z.string().uuid().optional().nullable(),
    companyName: z.string().optional().nullable(),
    company_name: z.string().optional().nullable(),
    branchName: z.string().optional().nullable(),
    branch_name: z.string().optional().nullable(),
    title: z.string().optional(),
    interview_date: z.string().optional(),
    interview_time: z.string().optional(),
    interview_type: z.string().optional(),
    interviewer_name: z.string().optional(),
    candidate_name: z.string().optional(),
    role: z.string().optional(),
    department: z.string().optional(),
    notes: z.string().optional(),
    
    submissionId: z.string().uuid().optional().nullable(),
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

const interviewUpdateSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    companyId: z.string().uuid().optional().nullable(),
    company_id: z.string().uuid().optional().nullable(),
    branchId: z.string().uuid().optional().nullable(),
    branch_id: z.string().uuid().optional().nullable(),
    companyName: z.string().optional().nullable(),
    company_name: z.string().optional().nullable(),
    branchName: z.string().optional().nullable(),
    branch_name: z.string().optional().nullable(),
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
