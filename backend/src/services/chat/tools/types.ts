import type { ToolParametersSchema } from '../../../integrations/chatAssistant';

/**
 * services/chat/tools/types.ts
 *
 * Shared shapes for the chat assistant's read-only tool registry.
 */

/** Auth/tenant context passed to every tool handler. */
export interface ToolContext {
  userId: string;
  role: string;
}

/** A single read-only tool the assistant may call. */
export interface ChatTool {
  name: string;
  description: string;
  /** JSON-schema (draft-07 subset) for the tool's arguments. */
  parameters: ToolParametersSchema;
  /** Executes the tool. Must be READ-ONLY and PII-safe in what it returns. */
  handler: (args: Record<string, unknown>, ctx: ToolContext) => Promise<unknown>;
}
