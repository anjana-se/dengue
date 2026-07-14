import { z } from 'zod';

export const sendMessageSchema = z.object({
  message: z.string().min(1).max(4000),
  language: z.enum(['en', 'si', 'ta']).optional(),
  session_id: z.string().uuid().optional(),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const listSessionsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});
export type ListSessionsQuery = z.infer<typeof listSessionsSchema>;
