import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { sendMessageSchema, listSessionsSchema } from './chat.schemas';
import { handleSendMessage, handleListSessions, handleGetSessionHistory } from './chat.controller';

/**
 * services/chat/chat.routes.ts — Mounted at /api/v1/chat
 *
 *   POST /chat/message            — Send message, get AI reply (phi, ndcu_admin)
 *   GET  /chat/sessions           — List current user's sessions
 *   GET  /chat/sessions/:id       — Get session history
 */

export const chatRouter = Router();

chatRouter.use(authenticate);

chatRouter.post(
  '/message',
  requireRole('phi', 'ndcu_admin'),
  validate(sendMessageSchema),
  handleSendMessage,
);

chatRouter.get(
  '/sessions',
  requireRole('phi', 'ndcu_admin'),
  validate(listSessionsSchema, 'query'),
  handleListSessions,
);

chatRouter.get(
  '/sessions/:id',
  requireRole('phi', 'ndcu_admin'),
  handleGetSessionHistory,
);
