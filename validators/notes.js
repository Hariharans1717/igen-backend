const { z } = require('zod');
const { candidateIdParamSchema } = require('./common');

const noteCreateSchema = z.object({
  body: z.object({
    candidateId: z.string().uuid(),
    title: z.string().trim().optional(),
    content: z.string().trim().min(1),
    category: z.string().optional(),
    priority: z.string().optional(),
    status: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

const noteUpdateSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    title: z.string().trim().optional(),
    content: z.string().trim().optional(),
    category: z.string().optional(),
    priority: z.string().optional(),
    status: z.string().optional(),
    changeReason: z.string().optional(),
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
