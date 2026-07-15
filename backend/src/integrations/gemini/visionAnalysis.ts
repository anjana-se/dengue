import fs from 'fs';
import { getModel } from './client';
import { config } from '../../config/env';
import { logger } from '../../shared/logger';
import { parseVisionResponse, type ParsedAnalysisResult } from './responseParser';
import {
  buildVisionSystemPrompt,
  buildVisionUserPrompt,
} from './promptTemplates/systemPrompts';

/**
 * integrations/gemini/visionAnalysis.ts
 *
 * Sends a breeding-site image to Gemini for analysis.
 * Uses GEMINI_VISION_MODEL (multimodal — accepts image bytes + text).
 *
 * The image is read from disk (already resized by imageProcessing/resize.util.ts),
 * base64-encoded, and sent as an inline data part.
 */

export async function analyzeBreedingSiteImage(
  imagePath: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg',
): Promise<ParsedAnalysisResult> {
  logger.debug('Starting Gemini vision analysis', { imagePath });

  // Read image bytes and base64-encode for inline data
  const imageBytes = await fs.promises.readFile(imagePath);
  const base64Image = imageBytes.toString('base64');

  logger.info('DEBUG [AI Image Data]: Sending image to Gemini API', {
    imagePath,
    fileSizeInBytes: imageBytes.length,
    base64Length: base64Image.length,
    base64Prefix: base64Image.slice(0, 50),
    mimeType,
  });

  const model = getModel(config.GEMINI_VISION_MODEL);
  const systemPrompt = buildVisionSystemPrompt();
  const userPrompt = buildVisionUserPrompt();

  const response = await model.generateContent({
    systemInstruction: systemPrompt,
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Image,
            },
          },
          { text: userPrompt },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,       // Low temperature for consistent, factual JSON output
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    },
  });

  const rawText = response.response.text();
  logger.debug('Gemini vision response received', {
    responseLength: rawText.length,
    preview: rawText.slice(0, 100),
  });

  const parsed = parseVisionResponse(rawText);
  logger.info('Vision analysis complete', {
    siteType: parsed.site_type,
    riskLevel: parsed.risk_level,
    confidence: parsed.confidence_score,
    needsHumanReview: parsed.needs_human_review,
  });

  return parsed;
}
