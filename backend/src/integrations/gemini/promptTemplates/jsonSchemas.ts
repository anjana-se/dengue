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

/** The JSON schema as a string — embedded in the Gemini prompt */
export const VISION_RESPONSE_SCHEMA_EXAMPLE = JSON.stringify(
  {
    site_type: 'plastic_container | drain | tyre | construction_water | flower_pot | roof_gutter | other',
    risk_level: 'low | medium | high | critical',
    confidence_score: 0.92,
    breeding_indicators: ['stagnant water visible', 'larvae detected', 'dark organic sediment'],
    guidance_text: 'Discard the container immediately and ensure the area is kept dry to prevent water accumulation.',
    guidance_text_si: 'භාජනය වහාම ඉවත් කර ජලය රැස්වීම වැළැක්වීම සඳහා ප්‍රදේශය වියලි ලෙස තබා ගන්න.',
    guidance_text_ta: 'கொள்கலனை உடனடியாக அகற்றி, நீர் தேங்குவதைத் தடுக்க பகுதி உலர வைக்கப்படுவதை உறுதிசெய்யவும்.',
    remediation_action: 'remove_container',
    is_dengue_risk: true,
    additional_notes: 'Water accumulated in a plastic bucket behind the residential property.',
  },
  null,
  2,
);
