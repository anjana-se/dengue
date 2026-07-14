import {
  createChatSession,
  listChatSessions,
  findChatSession,
  insertChatMessage,
  listChatMessages,
  touchSession,
  updateSessionTitle,
} from '../../db/queries/chat.queries';
import { generateChatReply } from '../../integrations/gemini/chatAssistant';
import { buildChatContext } from './contextBuilder';
import { parsePaginationParams, buildPaginatedResult } from '../../shared/pagination.util';
import { NotFoundError } from '../../shared/httpErrors';
import { logger } from '../../shared/logger';
import type { Language } from '../../types/domain.types';
import type { SendMessageInput, ListSessionsQuery } from './chat.schemas';

/**
 * services/chat/chat.service.ts
 *
 * Handles session management + the message send/reply loop.
 * History is limited to the last 20 turns to keep token count bounded.
 */

const MAX_HISTORY_TURNS = 20;

export async function sendMessageService(
  input: SendMessageInput,
  userId: string,
) {
  const language = (input.language ?? 'en') as Language;

  // ── 1. Get or create session ─────────────────────────────────────────────
  let sessionId = input.session_id;
  if (sessionId) {
    const existing = await findChatSession(sessionId, userId);
    if (!existing) throw new NotFoundError(`Chat session ${sessionId} not found`, 'SESSION_NOT_FOUND');
  } else {
    const session = await createChatSession(userId, language);
    sessionId = session.id;
  }

  // ── 2. Load recent history ───────────────────────────────────────────────
  const history = await listChatMessages(sessionId, MAX_HISTORY_TURNS * 2);
  const historyTurns = history.map((m) => ({
    role: m.role as 'user' | 'model',
    content: m.content,
  }));

  // ── 3. Build platform context ────────────────────────────────────────────
  const contextJson = await buildChatContext();

  // ── 4. Call Gemini ───────────────────────────────────────────────────────
  logger.debug('Sending message to Gemini chat', { sessionId, userId, language });
  const reply = await generateChatReply(input.message, language, contextJson, historyTurns);

  // ── 5. Persist both turns ────────────────────────────────────────────────
  await insertChatMessage(sessionId, 'user', input.message);
  await insertChatMessage(sessionId, 'model', reply);
  await touchSession(sessionId);

  // Auto-generate session title from first user message (truncated)
  if (history.length === 0) {
    const title = input.message.slice(0, 60) + (input.message.length > 60 ? '…' : '');
    await updateSessionTitle(sessionId, title);
  }

  return {
    session_id: sessionId,
    reply,
    language,
  };
}

export async function listSessionsService(query: ListSessionsQuery, userId: string) {
  const { page, limit, offset } = parsePaginationParams(query.page, query.limit);
  const { rows, total } = await listChatSessions(userId, limit, offset);
  return buildPaginatedResult(rows, total, { page, limit, offset });
}

export async function getSessionHistoryService(sessionId: string, userId: string) {
  const session = await findChatSession(sessionId, userId);
  if (!session) throw new NotFoundError(`Chat session ${sessionId} not found`, 'SESSION_NOT_FOUND');

  const messages = await listChatMessages(sessionId, 100);
  return { session, messages };
}
