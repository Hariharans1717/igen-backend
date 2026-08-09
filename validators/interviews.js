const { z } = require('zod');
const { INTERVIEW_RESULTS, INTERVIEW_MODES } = require('../utils/enums');
const { paginationSchema, candidateIdParamSchema } = require('./common');

const uuidOrEmpty = z.string().uuid().or(z.literal('')).optional().nullable();

const interviewCreateSchema = z.object({
  params: z.object({}).passthrough().optional(),
  query: z.object({}).passthrough().optional(),
  body: z.object({
    candidate_id: z.union([z.string(), z.number()]).optional(),
    companyId: uuidOrEmpty,
    company_id: uuidOrEmpty,
    branchId: uuidOrEmpty,
    branch_id: uuidOrEmpty,
    companyName: z.string().optional().nullable(),
    company_name: z.string().optional().nullable(),
    branchName: z.string().optional().nullable(),
    branch_name: z.string().optional().nullable(),
    title: z.string().optional(),
    interview_date: z.string().optional().nullable(),
    interview_time: z.string().optional().nullable(),
    interview_type: z.string().optional().nullable(),
    interviewer_name: z.string().optional().nullable(),
    candidate_name: z.string().optional().nullable(),
    role: z.string().optional().nullable(),
    department: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    
    submissionId: uuidOrEmpty,
    interviewDate: z.string().trim().optional().nullable(),
    round: z.string().trim().optional().nullable(),
    mode: z.string().optional().nullable(),
    feedback: z.string().trim().optional().nullable(),
    result: z.string().optional().nullable(),
    offeredCTC: z.coerce.number().nonnegative().optional().nullable(),
    offerStatus: z.string().trim().optional().nullable(),
    joiningDate: z.string().trim().optional().nullable(),
    recruiterNotes: z.string().trim().optional().nullable(),
    subStatus: z.string().trim().optional().nullable(),
    sub_status: z.string().trim().optional().nullable(),
  }).passthrough(),
});

const interviewUpdateSchema = z.object({
  params: z.object({ id: z.string() }).passthrough(),
  query: z.object({}).passthrough().optional(),
  body: z.object({
    candidate_id: z.union([z.string(), z.number()]).optional(),
    companyId: uuidOrEmpty,
    company_id: uuidOrEmpty,
    branchId: uuidOrEmpty,
    branch_id: uuidOrEmpty,
    companyName: z.string().optional().nullable(),
    company_name: z.string().optional().nullable(),
    branchName: z.string().optional().nullable(),
    branch_name: z.string().optional().nullable(),
    title: z.string().optional().nullable(),
    interview_date: z.string().optional().nullable(),
    interview_time: z.string().optional().nullable(),
    interview_type: z.string().optional().nullable(),
    interviewer_name: z.string().optional().nullable(),
    candidate_name: z.string().optional().nullable(),
    role: z.string().optional().nullable(),
    department: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    
    submissionId: uuidOrEmpty,
    interviewDate: z.string().trim().optional().nullable(),
    round: z.string().trim().optional().nullable(),
    mode: z.string().optional().nullable(),
    feedback: z.string().trim().optional().nullable(),
    result: z.string().optional().nullable(),
    offeredCTC: z.coerce.number().nonnegative().optional().nullable(),
    offerStatus: z.string().trim().optional().nullable(),
    joiningDate: z.string().trim().optional().nullable(),
    recruiterNotes: z.string().trim().optional().nullable(),
    subStatus: z.string().trim().optional().nullable(),
    sub_status: z.string().trim().optional().nullable(),
  }).passthrough(),
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
