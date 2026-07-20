import { visionAnalysisResponseSchema, type VisionAnalysisResponse } from './promptTemplates/jsonSchemas';
import { config } from '../../config/env';
import { logger } from '../../shared/logger';

/**
 * integrations/gemini/responseParser.ts
 *
 * Validates and parses Gemini's raw text response:
 *  1. Extracts JSON from the response text (strips any accidental markdown fences)
 *  2. Validates against the visionAnalysisResponseSchema
 *  3. Applies the confidence gate: < AI_ANALYSIS_CONFIDENCE_THRESHOLD → needs_human_review
 *
 * Shared between visionAnalysis.ts and used as the authoritative parse step.
 */

export interface ParsedAnalysisResult extends VisionAnalysisResponse {
  needs_human_review: boolean;
}

/**
 * Strips markdown code fences if the model wrapped its JSON response.
 */
function extractJson(rawText: string): string {
  // Strip ```json ... ``` or ``` ... ``` fences
  const fenceMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();

  // Strip leading/trailing whitespace
  return rawText.trim();
}

/**
 * Parses and validates a raw Gemini vision analysis response.
 * Throws if the response cannot be parsed or fails schema validation.
 */
export function parseVisionResponse(rawText: string): ParsedAnalysisResult {
  const jsonStr = extractJson(rawText);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    logger.error('Gemini response is not valid JSON', {
      rawText: rawText.slice(0, 500),
      error: (err as Error).message,
    });
    throw new Error(`Gemini response could not be parsed as JSON: ${(err as Error).message}`);
  }

  const result = visionAnalysisResponseSchema.safeParse(parsed);
  if (!result.success) {
    logger.error('Gemini response failed schema validation', {
      issues: result.error.flatten().fieldErrors,
      rawText: rawText.slice(0, 500),
    });
    throw new Error(`Gemini response failed validation: ${JSON.stringify(result.error.flatten().fieldErrors)}`);
  }

  const data = result.data;
  const confidenceThreshold = config.AI_ANALYSIS_CONFIDENCE_THRESHOLD;
  const belowThreshold = data.confidence_score < confidenceThreshold;
  // Combine the confidence gate with the model's own self-assessment. This can
  // only ever make the gate MORE conservative (flag more for review) — the
  // appropriate default for health-surveillance decisions.
  const needs_human_review = belowThreshold || data.needs_human_review === true;

  if (needs_human_review) {
    logger.info('Report flagged for human review', {
      confidence: data.confidence_score,
      threshold: confidenceThreshold,
      belowThreshold,
      modelFlagged: data.needs_human_review === true,
    });
  }

  return { ...data, needs_human_review };
}
