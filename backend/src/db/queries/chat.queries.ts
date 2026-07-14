import { query } from '../client';

/**
 * db/queries/chat.queries.ts — Typed SQL for chat sessions and messages.
 * Tables are created on-the-fly at startup via migration 009 (below).
 */

export interface ChatSession {
  id: string;
  user_id: string;
  title: string | null;
  language: string;
  created_at: Date;
  updated_at: Date;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'model';
  content: string;
  created_at: Date;
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export async function createChatSession(userId: string, language: string): Promise<ChatSession> {
  const result = await query<ChatSession>(
    `INSERT INTO chat_sessions (user_id, language)
     VALUES ($1, $2)
     RETURNING *`,
    [userId, language],
  );
  return result.rows[0];
}

export async function listChatSessions(
  userId: string,
  limit: number,
  offset: number,
): Promise<{ rows: ChatSession[]; total: number }> {
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM chat_sessions WHERE user_id = $1`,
    [userId],
  );
  const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

  const dataResult = await query<ChatSession>(
    `SELECT * FROM chat_sessions WHERE user_id = $1
     ORDER BY updated_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  );

  return { rows: dataResult.rows, total };
}

export async function findChatSession(sessionId: string, userId: string): Promise<ChatSession | null> {
  const result = await query<ChatSession>(
    `SELECT * FROM chat_sessions WHERE id = $1 AND user_id = $2`,
    [sessionId, userId],
  );
  return result.rows[0] ?? null;
}

export async function updateSessionTitle(sessionId: string, title: string): Promise<void> {
  await query(
    `UPDATE chat_sessions SET title = $1, updated_at = NOW() WHERE id = $2`,
    [title, sessionId],
  );
}

export async function touchSession(sessionId: string): Promise<void> {
  await query(`UPDATE chat_sessions SET updated_at = NOW() WHERE id = $1`, [sessionId]);
}

// ─── Messages ────────────────────────────────────────────────────────────────

export async function insertChatMessage(
  sessionId: string,
  role: 'user' | 'model',
  content: string,
): Promise<ChatMessage> {
  const result = await query<ChatMessage>(
    `INSERT INTO chat_messages (session_id, role, content)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [sessionId, role, content],
  );
  return result.rows[0];
}

export async function listChatMessages(
  sessionId: string,
  limit = 50,
): Promise<ChatMessage[]> {
  const result = await query<ChatMessage>(
    `SELECT * FROM chat_messages
     WHERE session_id = $1
     ORDER BY created_at ASC
     LIMIT $2`,
    [sessionId, limit],
  );
  return result.rows;
}
