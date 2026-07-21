import {
  createChatSession,
  listChatSessions,
  findChatSession,
  insertChatMessage,
  listChatMessages,
  touchSession,
  updateSessionTitle,
} from '../../db/queries/chat.queries';
import { generateChatReply, type ToolExecutor } from '../../integrations/chatAssistant';
import { buildChatContext } from './contextBuilder';
import { chatToolDefs, runChatTool } from './tools';
import { createAuditEntry } from '../../db/queries/auditLog.queries';
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
 * Owns tool execution: the model requests a tool, we run it here (auth-scoped,
 * audit-logged), and hand the result back to the provider.
 */

const MAX_HISTORY_TURNS = 20;

export async function sendMessageService(
  input: SendMessageInput,
  userId: string,
  role: string,
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

  // ── 4. Tool executor (auth-scoped, audit-logged) ─────────────────────────
  // Resolves rather than rejects so the model can recover from a tool error.
  const executeTool: ToolExecutor = async (name, args) => {
    let ok = true;
    try {
      return await runChatTool(name, args, { userId, role });
    } catch (err) {
      ok = false;
      logger.warn('Chat tool execution failed', { name, error: (err as Error).message });
      return { error: (err as Error).message };
    } finally {
      // Regulated-domain audit trail: record every tool invocation.
      createAuditEntry({
        user_id: userId,
        action: `chat.tool.${name}`,
        entity_type: 'chat_tool',
        new_values: { args, ok },
      }).catch((e) => logger.warn('Failed to write chat tool audit entry', { error: (e as Error).message }));
    }
  };

  // ── 5. Generate reply (provider owns the tool-calling loop) ──────────────
  logger.debug('Sending message to chat assistant', { sessionId, userId, language });
  const reply = await generateChatReply({
    message: input.message,
    language,
    contextJson,
    history: historyTurns,
    tools: chatToolDefs,
    executeTool,
  });

  // ── 6. Persist both turns ────────────────────────────────────────────────
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
