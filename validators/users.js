const { z } = require('zod');
const { USER_ROLES } = require('../utils/enums');

const userCreateSchema = z.object({
  body: z.object({
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
    email: z.string().email(),
    mobile: z.string().trim().optional(),
    role: z.enum(USER_ROLES).optional(),
    password: z.string().min(1),
  }),
});

const userStatusSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({
    isActive: z.boolean(),
  }),
});

module.exports = {
  userCreateSchema,
  userStatusSchema,
};
