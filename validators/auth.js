const { z } = require('zod');
const { USER_ROLES } = require('../utils/enums');

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

const registerSchema = z.object({
  body: z.object({
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
    email: z.string().email(),
    mobile: z.string().trim().optional(),
    password: z.string().min(1),
    role: z.enum(USER_ROLES).optional(),
  }),
});

const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1),
  }),
});

const logoutSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1),
  }),
});

const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(1),
  }),
});

module.exports = {
  loginSchema,
  registerSchema,
  refreshSchema,
  logoutSchema,
  changePasswordSchema,
};
