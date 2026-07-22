import { SchemaType, type Tool, type Content } from '@google/generative-ai';
import { getModel } from './client';
import { config } from '../../config/env';
import { logger } from '../../shared/logger';
import { buildChatSystemPrompt } from './promptTemplates/systemPrompts';
import type {
  GenerateChatReplyParams,
  ChatToolDef,
} from '../chatAssistant';

/**
 * integrations/gemini/chatAssistant.ts
 *
 * Gemini implementation of the chat provider. Owns the Gemini-specific
 * function-calling wire loop: declare tools → run → if the model emits
 * functionCall(s), execute them via the injected `executeTool` callback →
 * feed functionResponse(s) back → repeat (bounded). Knows nothing about
 * sessions, the DB, auth, or audit — those live in services/chat.
 */

const MAX_TOOL_ITERATIONS = 3;

/** Maps our draft-07 JSON-schema subset to Gemini's SchemaType-based schema. */
function toGeminiSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const typeMap: Record<string, SchemaType> = {
    object: SchemaType.OBJECT,
    string: SchemaType.STRING,
    number: SchemaType.NUMBER,
    integer: SchemaType.NUMBER,
    boolean: SchemaType.BOOLEAN,
    array: SchemaType.ARRAY,
  };

  const out: Record<string, unknown> = {
    type: typeMap[String(schema.type)] ?? SchemaType.STRING,
  };
  if (schema.description) out.description = schema.description;
  if (Array.isArray(schema.enum)) out.enum = schema.enum;
  if (schema.type === 'object') {
    const props = (schema.properties as Record<string, Record<string, unknown>>) ?? {};
    const mapped: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(props)) {
      mapped[key] = toGeminiSchema(val);
    }
    out.properties = mapped;
    if (Array.isArray(schema.required) && schema.required.length) out.required = schema.required;
  }
  if (schema.type === 'array' && schema.items) {
    out.items = toGeminiSchema(schema.items as Record<string, unknown>);
  }
  return out;
}

function buildGeminiTools(defs: ChatToolDef[]): Tool[] {
  return [
    {
      functionDeclarations: defs.map((d) => ({
        name: d.name,
        description: d.description,
        parameters: toGeminiSchema(d.parameters),
      })),
    } as unknown as Tool,
  ];
}

export async function generateGeminiChatReply(
  params: GenerateChatReplyParams,
): Promise<string> {
  const { message, language, contextJson, history = [], tools = [], executeTool } = params;

  const model = getModel(config.GEMINI_CHAT_MODEL);
  const systemInstruction = buildChatSystemPrompt(language, contextJson);
  const geminiTools = tools.length ? buildGeminiTools(tools) : undefined;

  // Seed the conversation: prior turns + current user message.
  const contents: Content[] = [
    ...history.map((turn) => ({ role: turn.role, parts: [{ text: turn.content }] })),
    { role: 'user', parts: [{ text: message }] },
  ];

  logger.debug('Calling Gemini chat assistant', {
    language,
    historyLength: history.length,
    toolCount: tools.length,
  });

  try {
    // Bounded tool-calling loop. +1 to allow a final text turn after the last
    // permitted tool round.
    for (let i = 0; i <= MAX_TOOL_ITERATIONS; i++) {
      const result = await model.generateContent({
        systemInstruction,
        contents,
        tools: geminiTools,
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1024,
        },
      });

      const response = result.response;
      const calls = executeTool ? (response.functionCalls() ?? []) : [];

      if (calls.length === 0) {
        return response.text().trim();
      }

      // On the last iteration, stop asking for tools and force a text answer.
      if (i === MAX_TOOL_ITERATIONS) {
        logger.warn('Chat assistant hit tool-iteration cap; forcing text reply');
        const finalModel = getModel(config.GEMINI_CHAT_MODEL);
        const finalResult = await finalModel.generateContent({
          systemInstruction,
          contents,
          generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
        });
        return finalResult.response.text().trim();
      }

      // Append the model's tool-call turn, then execute each call and append the
      // results as a single user turn of functionResponse parts.
      const modelContent = response.candidates?.[0]?.content;
      if (modelContent) contents.push(modelContent);

      const responseParts = [];
      for (const call of calls) {
        let output: unknown;
        try {
          output = await executeTool!(call.name, (call.args ?? {}) as Record<string, unknown>);
        } catch (err) {
          output = { error: (err as Error).message };
        }
        responseParts.push({
          functionResponse: { name: call.name, response: { result: output } },
        });
      }
      // Gemini accepts only 'user'/'model' roles; function results are sent as
      // functionResponse parts inside a 'user' turn (not a 'function' role).
      contents.push({ role: 'user', parts: responseParts });
    }

    // Unreachable in practice (the i === MAX_TOOL_ITERATIONS branch returns).
    return '';
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    logger.warn('AI chat assistant call failed, returning fallback response', { error: e?.message });
    if (e?.message?.includes('429') || e?.status === 429) {
      return "I'm experiencing high traffic at the moment. Please try again in a few seconds. In the meantime, you can review high-risk zones and open work orders directly on the dashboard.";
    }
    return 'I am DengueGuard Assistant. Currently, live platform telemetry and risk indicators are active. How can I assist you with vector control actions?';
  }
}
