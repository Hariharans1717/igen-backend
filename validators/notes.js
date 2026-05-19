const { z } = require('zod');
const { candidateIdParamSchema } = require('./common');

const noteCreateSchema = z.object({
  body: z.object({
    candidateId: z.string().uuid(),
    content: z.string().trim().min(1),
  }),
});

const noteUpdateSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    content: z.string().trim().min(1),
  }),
});

const noteDeleteSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

const noteByCandidateSchema = z.object({
  params: candidateIdParamSchema,
});

module.exports = {
  noteCreateSchema,
  noteUpdateSchema,
  noteDeleteSchema,
  noteByCandidateSchema,
};
