import { getModel } from './client';
import { config } from '../../config/env';
import { logger } from '../../shared/logger';
import { buildTranslationSystemPrompt } from './promptTemplates/systemPrompts';
import type { Language } from '../../types/domain.types';

/**
 * integrations/gemini/translation.ts
 *
 * Translates English guidance text to Sinhala or Tamil.
 * Uses GEMINI_TRANSLATION_MODEL.
 *
 * Called by the AI worker after a report is analysed, for guidance_text_si
 * and guidance_text_ta fields.
 */

export async function translateGuidanceText(
  englishText: string,
  targetLanguage: Exclude<Language, 'en'>,
): Promise<string> {
  if (!englishText.trim()) return '';

  logger.debug('Translating guidance text', { targetLanguage, textLength: englishText.length });

  const model = getModel(config.GEMINI_TRANSLATION_MODEL);
  const systemPrompt = buildTranslationSystemPrompt(targetLanguage);

  const response = await model.generateContent({
    systemInstruction: systemPrompt,
    contents: [
      {
        role: 'user',
        parts: [{ text: englishText }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 512,
    },
  });

  const translated = response.response.text().trim();
  logger.debug('Translation complete', { targetLanguage, outputLength: translated.length });
  return translated;
}

/**
 * Convenience: translates to both si and ta in parallel.
 * Returns partial results (empty string) if either translation fails.
 */
export async function translateGuidanceTextBoth(englishText: string): Promise<{
  si: string;
  ta: string;
}> {
  const [si, ta] = await Promise.allSettled([
    translateGuidanceText(englishText, 'si'),
    translateGuidanceText(englishText, 'ta'),
  ]);

  return {
    si: si.status === 'fulfilled' ? si.value : '',
    ta: ta.status === 'fulfilled' ? ta.value : '',
  };
}
