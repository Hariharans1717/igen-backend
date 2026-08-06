const { z } = require('zod');
const { CANDIDATE_STATUSES, EMPLOYMENT_STATUSES } = require('../utils/enums');
const { paginationSchema } = require('./common');

const candidateCreateSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1),
    email: z.string().email(),
    mobile: z.string().trim().min(5),
    employmentStatus: z.enum(EMPLOYMENT_STATUSES),
    expectedCTC: z.coerce.number().nonnegative(),
    expectedCurrency: z.string().optional(),
    preferredLocation: z.string().trim().min(1),
    skills: z.array(z.string().trim()).optional(),
    tags: z.array(z.string().trim()).optional().nullable(),
    status: z.enum(CANDIDATE_STATUSES).optional(),
    currentCompany: z.string().trim().optional().nullable(),
    currentDesignation: z.string().trim().optional().nullable(),
    department: z.string().trim().optional().nullable(),
    currentCTC: z.coerce.number().nonnegative().optional().nullable(),
    currentCurrency: z.string().optional(),
    experience: z.coerce.number().nonnegative().optional().nullable(),
    createdBy: z.string().optional().nullable(),
    photoUrl: z.string().trim().optional().nullable(),
    resumeUrl: z.string().trim().optional().nullable(),
    resumeFilename: z.string().trim().optional().nullable(),
    aadhaarNumber: z.string().trim().optional().nullable(),
    aadhaarLast4: z.string().trim().optional().nullable(),
    panNumber: z.string().trim().optional().nullable(),
    candidateCode: z.string().trim().optional().nullable(),
    dob: z.string().trim().optional().nullable(),
    expectedHikePercent: z.coerce.number().min(0).max(1000).optional().nullable(),
    noticePeriod: z.string().trim().optional().nullable(),
    currentLocation: z.string().trim().optional().nullable(),
    remarks: z.string().trim().optional().nullable(),
  }),
});

const candidateUpdateSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    name: z.string().trim().min(1).optional(),
    email: z.string().email().optional(),
    mobile: z.string().trim().min(5).optional(),
    employmentStatus: z.enum(EMPLOYMENT_STATUSES).optional(),
    expectedCTC: z.coerce.number().nonnegative().optional(),
    expectedCurrency: z.string().optional(),
    preferredLocation: z.string().trim().optional(),
    skills: z.array(z.string().trim()).optional(),
    tags: z.array(z.string().trim()).optional().nullable(),
    status: z.enum(CANDIDATE_STATUSES).optional(),
    currentCompany: z.string().trim().optional().nullable(),
    currentDesignation: z.string().trim().optional().nullable(),
    department: z.string().trim().optional().nullable(),
    currentCTC: z.coerce.number().nonnegative().optional().nullable(),
    currentCurrency: z.string().optional(),
    experience: z.coerce.number().nonnegative().optional().nullable(),
    photoUrl: z.string().trim().optional().nullable(),
    resumeUrl: z.string().trim().optional().nullable(),
    resumeFilename: z.string().trim().optional().nullable(),
    aadhaarNumber: z.string().trim().optional().nullable(),
    aadhaarLast4: z.string().trim().optional().nullable(),
    panNumber: z.string().trim().optional().nullable(),
    candidateCode: z.string().trim().optional().nullable(),
    dob: z.string().trim().optional().nullable(),
    expectedHikePercent: z.coerce.number().min(0).max(1000).optional().nullable(),
    noticePeriod: z.string().trim().optional().nullable(),
    currentLocation: z.string().trim().optional().nullable(),
    remarks: z.string().trim().optional().nullable(),
    notes: z.string().trim().optional().nullable(),
    createdBy: z.string().optional().nullable(),
  }),
});

const candidateListSchema = z.object({
  query: paginationSchema.extend({
    status: z.enum(CANDIDATE_STATUSES).optional(),
    location: z.string().trim().optional(),
    experienceMin: z.coerce.number().nonnegative().optional(),
    experienceMax: z.coerce.number().nonnegative().optional(),
    ctcMin: z.coerce.number().nonnegative().optional(),
    ctcMax: z.coerce.number().nonnegative().optional(),
    skills: z.string().trim().optional(),
    companyName: z.string().trim().optional(),
  }),
});

const candidateDuplicateSchema = z.object({
  body: z.object({
    email: z.string().email().optional(),
    mobile: z.string().trim().min(5).optional(),
    excludeId: z.string().uuid().optional(),
  }),
});

module.exports = {
  candidateCreateSchema,
  candidateUpdateSchema,
  candidateListSchema,
  candidateDuplicateSchema,
};
