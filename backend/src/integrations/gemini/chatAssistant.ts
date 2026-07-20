import { getModel } from './client';
import { config } from '../../config/env';
import { logger } from '../../shared/logger';
import { buildChatSystemPrompt } from './promptTemplates/systemPrompts';
import type { Language } from '../../types/domain.types';

/**
 * integrations/gemini/chatAssistant.ts
 *
 * Handles the Gemini API call for the chat assistant.
 * Owns the actual API call and system-prompt assembly.
 * Does NOT know about sessions, context building, or DB — those live in chat.service.
 *
 * @param message       The user's current message
 * @param language      Detected or declared language for the response
 * @param contextJson   JSON string of live platform context (from contextBuilder.ts)
 * @param history       Prior conversation turns (for multi-turn context)
 */

export interface ChatTurn {
  role: 'user' | 'model';
  content: string;
}

export async function generateChatReply(
  message: string,
  language: Language,
  contextJson: string,
  history: ChatTurn[] = [],
): Promise<string> {
  logger.debug('Calling Gemini chat assistant', {
    language,
    historyLength: history.length,
    messageLength: message.length,
  });

  const model = getModel(config.GEMINI_CHAT_MODEL);
  const systemPrompt = buildChatSystemPrompt(language, contextJson);

  // Build multi-turn content array
  // Gemini expects alternating user/model turns; inject history first
  const contents = [
    // Prior turns
    ...history.map((turn) => ({
      role: turn.role,
      parts: [{ text: turn.content }],
    })),
    // Current user message
    {
      role: 'user' as const,
      parts: [{ text: message }],
    },
  ];

  try {
    const response = await model.generateContent({
      systemInstruction: systemPrompt,
      contents,
      generationConfig: {
        temperature: 0.4,       // Slightly creative but grounded
        maxOutputTokens: 512,   // Keep replies concise
      },
    });

    const reply = response.response.text().trim();
    logger.debug('Chat reply generated', { replyLength: reply.length });
    return reply;
  } catch (err: any) {
    logger.warn('AI chat assistant call failed, returning fallback response', { error: err.message });
    if (err?.message?.includes('429') || err?.status === 429) {
      return "I'm experiencing high traffic at the moment. Please try again in a few seconds. In the meantime, you can review high-risk zones and open work orders directly on the dashboard.";
    }
    return "I am DengueGuard Assistant. Currently, live platform telemetry and risk indicators are active. How can I assist you with vector control actions?";
  }
}
