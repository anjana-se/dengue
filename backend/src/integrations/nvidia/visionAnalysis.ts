import fs from 'fs';
import { config } from '../../config/env';
import { logger } from '../../shared/logger';
import { parseVisionResponse, type ParsedAnalysisResult } from '../gemini/responseParser';
import {
  buildVisionSystemPrompt,
  buildVisionUserPrompt,
} from '../gemini/promptTemplates/systemPrompts';

/**
 * integrations/nvidia/visionAnalysis.ts
 *
 * Sends a breeding-site image to NVIDIA's NIM API for analysis.
 * Uses NVIDIA_VISION_MODEL (multimodal VLM — e.g. meta/llama-3.2-11b-vision-instruct).
 *
 * The image is read from disk, base64-encoded, and sent as a data URI
 * in the OpenAI-compatible content array.
 */
export async function analyzeBreedingSiteImageNvidia(
  imagePath: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg',
): Promise<ParsedAnalysisResult> {
  logger.debug('Starting NVIDIA NIM vision analysis', { imagePath });

  if (!config.NVIDIA_API_KEY) {
    throw new Error('NVIDIA_API_KEY is not configured in environment variables');
  }

  // Read image bytes and base64-encode for inline data
  const imageBytes = await fs.promises.readFile(imagePath);
  const base64Image = imageBytes.toString('base64');

  const systemPrompt = buildVisionSystemPrompt();
  const userPrompt = buildVisionUserPrompt();

  logger.info('DEBUG [Nvidia AI Image Data]: Sending image to NVIDIA NIM API', {
    imagePath,
    fileSizeInBytes: imageBytes.length,
    base64Length: base64Image.length,
    base64Prefix: base64Image.slice(0, 50),
    mimeType,
  });

  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.NVIDIA_API_KEY}`,
    },
    body: JSON.stringify({
      model: config.NVIDIA_VISION_MODEL,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: userPrompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1024,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error('NVIDIA NIM API request failed', {
      status: response.status,
      statusText: response.statusText,
      errorText,
    });
    throw new Error(`NVIDIA NIM API request failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const resultData = await response.json() as {
    choices: Array<{
      message: {
        content: string;
      };
    }>;
  };

  const rawText = resultData.choices?.[0]?.message?.content || '';
  
  logger.debug('NVIDIA NIM vision response received', {
    responseLength: rawText.length,
    preview: rawText.slice(0, 100),
  });

  const parsed = parseVisionResponse(rawText);
  logger.info('NVIDIA NIM vision analysis complete', {
    siteType: parsed.site_type,
    riskLevel: parsed.risk_level,
    confidence: parsed.confidence_score,
    needsHumanReview: parsed.needs_human_review,
  });

  return parsed;
}
