import fs from 'fs';
import path from 'path';
import { config } from '../../config/env';
import { logger } from '../../shared/logger';

export interface ComparisonResult {
  duplicate: boolean;
  confidence: number;
  reasoning: string;
}

async function resolveImageToBase64(imageUrl: string): Promise<string> {
  // If it's a local upload
  const uploadsUrl = `/uploads/`;
  const idx = imageUrl.indexOf(uploadsUrl);
  if (idx !== -1) {
    const relPath = imageUrl.slice(idx + uploadsUrl.length);
    const fullPath = path.resolve(config.UPLOADS_DIR, relPath);
    if (fs.existsSync(fullPath)) {
      const buffer = await fs.promises.readFile(fullPath);
      return `data:image/jpeg;base64,${buffer.toString('base64')}`;
    }
  }

  // If it's a remote URL
  try {
    const res = await fetch(imageUrl);
    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return `data:image/jpeg;base64,${buffer.toString('base64')}`;
    }
  } catch (err: any) {
    logger.warn('Failed to download remote image for comparison', { imageUrl, error: err.message });
  }

  return '';
}

export async function compareReportsNvidia(
  report1: { site_type: string; description: string; latitude: number; longitude: number; image_url: string },
  report2: { site_type: string; description: string; latitude: number; longitude: number; image_url: string }
): Promise<ComparisonResult> {
  logger.info('Comparing reports for duplicate detection using NVIDIA NIM');

  if (!config.NVIDIA_API_KEY) {
    logger.warn('NVIDIA_API_KEY not defined, returning default comparison');
    return { duplicate: false, confidence: 0.5, reasoning: 'NVIDIA API key not set' };
  }

  try {
    const imgDataUrl1 = await resolveImageToBase64(report1.image_url);
    const imgDataUrl2 = await resolveImageToBase64(report2.image_url);

    const modelName = config.NVIDIA_VISION_MODEL || 'meta/llama-3.2-11b-vision-instruct';
    const isReasoningModel = modelName.includes('reasoning');

    const promptText = `Compare these two reports of potential mosquito breeding sites to determine if they are duplicate reports of the exact same physical breeding site (e.g. same garbage pile, same tyre, same clogged drain).
    
    Report 1 (Existing Incident):
    - Site Type: ${report1.site_type}
    - Description: ${report1.description || 'None'}
    - Latitude/Longitude: ${report1.latitude}, ${report1.longitude}
    
    Report 2 (New Incoming Report):
    - Site Type: ${report2.site_type}
    - Description: ${report2.description || 'None'}
    - Latitude/Longitude: ${report2.latitude}, ${report2.longitude}
    
    Visually compare the two images (first image is Report 1, second image is Report 2) and evaluate their location, descriptions, and site types.
    
    RESPONSE INSTRUCTIONS:
    1. Respond ONLY with a single valid JSON object matching the schema below. No markdown fences, no introductory or concluding text.
    2. The JSON object must be parseable.
    
    EXPECTED JSON SCHEMA:
    {
      "duplicate": boolean,
      "confidence": number, // 0.0 to 1.0 representing how confident you are that they represent the same physical site
      "reasoning": string // concise explanation of your decision
    }`;

    const content: any[] = [];
    if (imgDataUrl1) content.push({ type: 'image_url', image_url: { url: imgDataUrl1 } });
    if (imgDataUrl2) content.push({ type: 'image_url', image_url: { url: imgDataUrl2 } });
    content.push({ type: 'text', text: promptText });

    const messages = [{ role: 'user', content }];

    const payload: any = {
      model: modelName,
      messages,
      temperature: 0.2,
      top_p: 0.95,
      max_tokens: isReasoningModel ? 2048 : 1024,
      stream: false,
      response_format: { type: 'json_object' },
    };

    if (isReasoningModel) {
      payload.reasoning_budget = 512;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${config.NVIDIA_API_KEY}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`NVIDIA NIM API failed with status ${response.status}: ${errText}`);
    }

    const resData: any = await response.json();
    const rawText = resData.choices?.[0]?.message?.content;
    if (!rawText) throw new Error('Empty response from NVIDIA NIM');

    // Robust JSON extraction
    let cleanJsonStr = rawText.trim();
    
    // 1. Try markdown fences
    const fenceMatch = cleanJsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      cleanJsonStr = fenceMatch[1].trim();
    } else {
      // 2. Try matching from first '{' to last '}'
      const startIdx = cleanJsonStr.indexOf('{');
      const endIdx = cleanJsonStr.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        cleanJsonStr = cleanJsonStr.substring(startIdx, endIdx + 1).trim();
      }
    }

    try {
      const parsed = JSON.parse(cleanJsonStr);
      return {
        duplicate: Boolean(parsed.duplicate),
        confidence: parseFloat(parsed.confidence) || 0.5,
        reasoning: parsed.reasoning || 'No reasoning provided',
      };
    } catch (parseErr: any) {
      logger.warn('Failed to parse clean JSON from NVIDIA NIM response', {
        rawText,
        cleanJsonStr,
        error: parseErr.message
      });
      throw new Error(`Invalid JSON format: ${parseErr.message}`);
    }

  } catch (err: any) {
    logger.error('NVIDIA NIM duplicate comparison failed:', err);
    // Safe fallback based on simple heuristic
    const siteTypeMatch = report1.site_type === report2.site_type;
    return {
      duplicate: siteTypeMatch,
      confidence: siteTypeMatch ? 0.75 : 0.4,
      reasoning: `Fallback heuristic comparison (VLM comparison failed: ${err.message})`,
    };
  }
}
