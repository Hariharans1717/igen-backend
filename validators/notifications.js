const { z } = require('zod');

const notificationReadSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

module.exports = {
  notificationReadSchema,
};
