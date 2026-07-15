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
import { SITE_TYPES, RISK_LEVELS, REMEDIATION_ACTIONS } from '../../../config/constants';

/** Zod schema for validating the model's JSON response */
export const visionAnalysisResponseSchema = z.object({
  site_type: z.enum(SITE_TYPES),
  risk_level: z.enum([RISK_LEVELS.LOW, RISK_LEVELS.MEDIUM, RISK_LEVELS.HIGH, RISK_LEVELS.CRITICAL]),
  confidence_score: z.number().min(0).max(1),
  breeding_indicators: z.array(z.string()).min(0).max(10),
  guidance_text: z.string().min(1).max(1000),
  guidance_text_si: z.string().min(1).max(1000),
  guidance_text_ta: z.string().min(1).max(1000),
  remediation_action: z.enum(REMEDIATION_ACTIONS),
  is_dengue_risk: z.boolean(),
  additional_notes: z.string().max(500).optional(),
});

export type VisionAnalysisResponse = z.infer<typeof visionAnalysisResponseSchema>;

export const VISION_RESPONSE_SCHEMA_EXAMPLE = `{
  "site_type": "plastic_container | drain | tyre | construction_water | flower_pot | roof_gutter | other",
  "risk_level": "low | medium | high | critical",
  "confidence_score": <number between 0.0 and 1.0>,
  "breeding_indicators": [
    "<observed_breeding_indicator_1>",
    "<observed_breeding_indicator_2>"
  ],
  "guidance_text": "<Clear, actionable 1-3 sentence instruction in English for the field officer on what to do>",
  "guidance_text_si": "<High-quality Sinhala translation of guidance_text>",
  "guidance_text_ta": "<High-quality Tamil translation of guidance_text>",
  "remediation_action": "drain_water | remove_container | apply_larvicide | cover_container | clear_drain | spray_insecticide | public_notice | other",
  "is_dengue_risk": <boolean: true if there is any breeding site/larvae, false otherwise>,
  "additional_notes": "<Optional: any additional observations or details>"
}`;
