import { config } from '../config/env';
import { logger } from '../shared/logger';
import { generateGeminiChatReply } from './gemini/chatAssistant';
import type { Language } from '../types/domain.types';

/**
 * integrations/chatAssistant.ts
 *
 * Provider-agnostic router for the conversational chat assistant, mirroring the
 * pattern used by integrations/visionAnalysis.ts. Callers (services/chat) import
 * `generateChatReply` from here and never a concrete driver.
 *
 * A concrete provider owns the wire-format tool-calling loop for its SDK. Tool
 * *execution* (auth checks, DB access, audit logging) stays on the caller side and
 * is injected via the `executeTool` callback — so adding a 'claude' driver later is
 * a new file + one enum value, with no change to the tool registry or the service.
 */

export interface ChatTurn {
  role: 'user' | 'model';
  content: string;
}

/** JSON-schema (draft-07 subset) description of a tool's arguments. */
export type ToolParametersSchema = Record<string, unknown>;

/** A tool the model may call, as seen by the provider (no handler here). */
export interface ChatToolDef {
  name: string;
  description: string;
  parameters: ToolParametersSchema;
}

/**
 * Executes a tool the model requested and returns a JSON-serializable result.
 * Supplied by the caller (bound to the authenticated user + audit logging).
 * Should resolve — never reject — so the model can recover from a tool error;
 * on failure, return an object like `{ error: '...' }`.
 */
export type ToolExecutor = (
  name: string,
  args: Record<string, unknown>,
) => Promise<unknown>;

export interface GenerateChatReplyParams {
  message: string;
  language: Language;
  contextJson: string;
  history?: ChatTurn[];
  tools?: ChatToolDef[];
  executeTool?: ToolExecutor;
}

export interface ChatProvider {
  generateReply(params: GenerateChatReplyParams): Promise<string>;
}

/**
 * Routes a chat request to the configured provider. Currently Gemini-only;
 * extend the `CHAT_PROVIDER` enum in config/env.ts and this switch to add more.
 */
export async function generateChatReply(
  params: GenerateChatReplyParams,
): Promise<string> {
  const provider = config.CHAT_PROVIDER;
  logger.debug('Routing chat request', {
    provider,
    toolCount: params.tools?.length ?? 0,
  });

  switch (provider) {
    case 'gemini':
    default:
      return generateGeminiChatReply(params);
  }
}
