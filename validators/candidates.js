const { z } = require('zod');
const { CANDIDATE_STATUSES, EMPLOYMENT_STATUSES } = require('../utils/enums');
const { paginationSchema } = require('./common');

const validateAgeAbove18 = (val) => {
  if (!val) return true; // optional/nullable is allowed
  const birthDate = new Date(val);
  if (isNaN(birthDate.getTime())) return false; // invalid date not allowed
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 18;
};

const candidateCreateSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1),
    email: z.string().email(),
    mobile: z.string().trim().min(5),
    employmentStatus: z.enum(EMPLOYMENT_STATUSES),
    expectedCTC: z.coerce.number().nonnegative(),
    expectedCurrency: z.string().optional(),
    preferredLocation: z.string().trim().optional().nullable(),
    skills: z.array(z.string().trim()).optional(),
    keySkills: z.array(z.string().trim()).optional(),
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
    dob: z.string().trim().optional().nullable().refine(validateAgeAbove18, {
      message: 'Candidate must be 18 years or older',
    }),
    expectedHikePercent: z.coerce.number().min(0).max(1000).optional().nullable(),
    noticePeriod: z.string().trim().optional().nullable(),
    currentLocation: z.string().trim().optional().nullable(),
    remarks: z.string().trim().optional().nullable(),
    priority: z.boolean().optional(),
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
    preferredLocation: z.string().trim().optional().nullable(),
    skills: z.array(z.string().trim()).optional(),
    keySkills: z.array(z.string().trim()).optional(),
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
    dob: z.string().trim().optional().nullable().refine(validateAgeAbove18, {
      message: 'Candidate must be 18 years or older',
    }),
    expectedHikePercent: z.coerce.number().min(0).max(1000).optional().nullable(),
    noticePeriod: z.string().trim().optional().nullable(),
    currentLocation: z.string().trim().optional().nullable(),
    remarks: z.string().trim().optional().nullable(),
    notes: z.string().trim().optional().nullable(),
    isFavourite: z.boolean().optional(),
    isFlagged: z.boolean().optional(),
    isKey: z.boolean().optional(),
    isHot: z.boolean().optional(),
    priority: z.boolean().optional(),
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
    flags: z.union([z.string(), z.array(z.string())]).optional(),
    isFavourite: z.coerce.boolean().optional(),
    isFlagged: z.coerce.boolean().optional(),
    isKey: z.coerce.boolean().optional(),
    isHot: z.coerce.boolean().optional(),
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
