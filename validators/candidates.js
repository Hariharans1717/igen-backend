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
    preferredLocation: z.string().trim().min(1),
    skills: z.array(z.string().trim().min(1)).min(1),
    status: z.enum(CANDIDATE_STATUSES).optional(),
    currentCompany: z.string().trim().optional(),
    currentDesignation: z.string().trim().optional(),
    currentCTC: z.coerce.number().nonnegative().optional(),
    experience: z.coerce.number().nonnegative().optional(),
    createdBy: z.string().uuid().optional(),
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
    preferredLocation: z.string().trim().min(1).optional(),
    skills: z.array(z.string().trim().min(1)).min(1).optional(),
    status: z.enum(CANDIDATE_STATUSES).optional(),
    currentCompany: z.string().trim().optional().nullable(),
    currentDesignation: z.string().trim().optional().nullable(),
    currentCTC: z.coerce.number().nonnegative().optional().nullable(),
    experience: z.coerce.number().nonnegative().optional().nullable(),
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
