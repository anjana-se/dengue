/**
 * integrations/gemini/promptTemplates/jsonSchemas.ts
 *
 * The exact JSON response schema Gemini must return for vision analysis.
 * This is Appendix A from the technical spec.
 *
 * Used in two places:
 *  - Embedded in the vision analysis prompt as the expected output format
 *  - In responseParser.ts to validate the model's JSON output
 */

import { z } from 'zod';
import { SITE_TYPES, RISK_LEVELS, REMEDIATION_ACTIONS, LARVAE_VISIBILITY } from '../../../config/constants';

/** Zod schema for validating the model's JSON response */
export const visionAnalysisResponseSchema = z.object({
  site_type: z.enum(SITE_TYPES),
  risk_level: z.enum([
    RISK_LEVELS.NONE,
    RISK_LEVELS.LOW,
    RISK_LEVELS.MEDIUM,
    RISK_LEVELS.HIGH,
    RISK_LEVELS.CRITICAL,
  ]),
  confidence_score: z.number().min(0).max(1),
  water_present: z.boolean(),
  larvae_visible: z.enum(LARVAE_VISIBILITY),
  breeding_indicators: z.array(z.string()).min(0).max(10),
  guidance_text: z.string().min(1).max(1000),
  guidance_text_si: z.string().max(1000).optional(),
  guidance_text_ta: z.string().max(1000).optional(),
  remediation_action: z.enum(REMEDIATION_ACTIONS),
  is_dengue_risk: z.boolean(),
  // Supplementary self-assessment: the confidence gate in responseParser is the
  // authoritative source, so a missing value must never fail the whole analysis.
  needs_human_review: z.boolean().optional(),
  reasoning: z.string().max(500).optional(),
  additional_notes: z.string().max(500).optional(),
});

export type VisionAnalysisResponse = z.infer<typeof visionAnalysisResponseSchema>;

export const VISION_RESPONSE_SCHEMA_EXAMPLE = `{
  "site_type": "<exactly one value from the SITE TYPE TAXONOMY above>",
  "risk_level": "none | low | medium | high | critical",
  "confidence_score": <number between 0.0 and 1.0>,
  "water_present": <boolean: true if standing/stagnant water is visible or clearly implied>,
  "larvae_visible": "yes | no | unclear",
  "breeding_indicators": [
    "<observed_breeding_indicator_1>",
    "<observed_breeding_indicator_2>"
  ],
  "guidance_text": "<Clear, actionable 1-3 sentence instruction in English for the field officer on what to do>",
  "guidance_text_si": "<High-quality Sinhala translation of guidance_text>",
  "guidance_text_ta": "<High-quality Tamil translation of guidance_text>",
  "remediation_action": "<exactly one value from the REMEDIATION ACTIONS above>",
  "is_dengue_risk": <boolean: true if there is any breeding site/larvae, false otherwise>,
  "needs_human_review": <boolean: true if the image is ambiguous, low quality, or you are not confident>,
  "reasoning": "<Brief 1-2 sentence justification for your assessment>",
  "additional_notes": "<Optional: any additional observations or details>"
}`;
