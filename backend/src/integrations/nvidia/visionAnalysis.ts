import fs from 'fs';
import { config } from '../../config/env';
import { logger } from '../../shared/logger';
import { parseVisionResponse, type ParsedAnalysisResult } from '../gemini/responseParser';
import { translateGuidanceTextBoth } from '../gemini/translation';
import {
  buildNvidiaVisionSystemPrompt,
  buildVisionUserPrompt,
} from '../gemini/promptTemplates/systemPrompts';

/**
 * integrations/nvidia/visionAnalysis.ts
 *
 * Sends a breeding-site image to NVIDIA NIM API for vision analysis.
 * Uses NVIDIA_VISION_MODEL (multimodal VLM).
 *
 * Once the vision analysis is complete in English, Gemini is used
 * to translate the English guidance text into Sinhala (si) and Tamil (ta)
 * since the Nvidia VLM is less accurate with local languages.
 */

export async function analyzeBreedingSiteImageNvidia(
  imagePath: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg',
): Promise<ParsedAnalysisResult> {
  logger.debug('Starting NVIDIA NIM vision analysis', { imagePath });

  if (!config.NVIDIA_API_KEY) {
    throw new Error('NVIDIA_API_KEY is not defined in environment variables');
  }

  const modelName = config.NVIDIA_VISION_MODEL || 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning';
  logger.debug('Using NVIDIA vision model', { modelName });

  // Read image bytes and base64-encode for data URL
  const imageBytes = await fs.promises.readFile(imagePath);
  const base64Image = imageBytes.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64Image}`;

  const systemPrompt = buildNvidiaVisionSystemPrompt();
  const userPrompt = buildVisionUserPrompt();

  const messages = [
    {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: {
            url: dataUrl,
          },
        },
        {
          type: 'text',
          text: `${systemPrompt}\n\n${userPrompt}`,
        },
      ],
    },
  ];

  logger.debug('Sending request to NVIDIA NIM API...');
  const startTime = Date.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    logger.warn('NVIDIA NIM API call timed out after 75s, aborting request.');
    controller.abort();
  }, 80000);

  const isReasoningModel = modelName.includes('reasoning');
  const payload: any = {
    model: modelName,
    messages,
    temperature: 0.2,
    top_p: 0.95,
    max_tokens: isReasoningModel ? 4096 : 2048,
    stream: false,
    response_format: { type: 'json_object' },
  };

  if (isReasoningModel) {
    payload.reasoning_budget = 1024;
    payload.chat_template_kwargs = {
      enable_thinking: true,
      thinking: true,
    };
  }

  let response: Response;
  try {
    response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${config.NVIDIA_API_KEY}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('NVIDIA NIM API request timed out after 75 seconds');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  const durationMs = Date.now() - startTime;
  logger.debug('NVIDIA NIM API response received', { durationMs });

  const responseData: any = await response.json();

  if (!response.ok) {
    logger.error('NVIDIA NIM API call failed', {
      status: response.status,
      responseData,
    });
    throw new Error(`NVIDIA NIM API failed with status ${response.status}: ${JSON.stringify(responseData)}`);
  }

  const rawText = responseData.choices?.[0]?.message?.content;
  if (!rawText) {
    logger.error('NVIDIA NIM API returned empty message content', { responseData });
    throw new Error('NVIDIA NIM API returned empty content');
  }

  logger.debug('Raw text received from NVIDIA NIM', {
    responseLength: rawText.length,
    preview: rawText.slice(0, 150),
  });

  // Parse the Nvidia response using the existing Zod-based parser
  const parsed = parseVisionResponse(rawText);

  // Use Gemini to translate the guidance text to Sinhala and Tamil
  logger.info('Translating NVIDIA vision output using Gemini translation service...');
  const translations = await translateGuidanceTextBoth(parsed.guidance_text);

  parsed.guidance_text_si = translations.si || undefined;
  parsed.guidance_text_ta = translations.ta || undefined;

  logger.info('NVIDIA Vision analysis + Gemini translation complete', {
    siteType: parsed.site_type,
    riskLevel: parsed.risk_level,
    confidence: parsed.confidence_score,
    hasSiTranslation: !!parsed.guidance_text_si,
    hasTaTranslation: !!parsed.guidance_text_ta,
  });

  return parsed;
}
