import { z } from 'zod';

/**
 * services/reports/reports.schemas.ts — Zod validation schemas for reports endpoints.
 */

// ─── Create community report ─────────────────────────────────────────────────

export const createReportSchema = z.object({
  latitude: z.coerce
    .number()
    .min(-90)
    .max(90)
    .optional(),
  longitude: z.coerce
    .number()
    .min(-180)
    .max(180)
    .optional(),
  zone_id: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
  language: z.enum(['en', 'si', 'ta']).default('en'),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;

// ─── List reports ─────────────────────────────────────────────────────────────

export const listReportsSchema = z.object({
  zone_id: z.string().uuid().optional(),
  status: z
    .enum(['pending', 'processing', 'complete', 'needs_human_review', 'failed'])
    .optional(),
  risk_level: z.enum(['none', 'low', 'medium', 'high', 'critical']).optional(),
  source_type: z.enum(['community', 'drone']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ListReportsQuery = z.infer<typeof listReportsSchema>;

// ─── Review report (PHI marking needs_human_review → complete) ───────────────

export const reviewReportSchema = z.object({
  notes: z.string().max(2000).optional(),
  // PHI can override the AI risk level after physical inspection
  risk_level: z.enum(['none', 'low', 'medium', 'high', 'critical']).optional(),
});

export type ReviewReportInput = z.infer<typeof reviewReportSchema>;
