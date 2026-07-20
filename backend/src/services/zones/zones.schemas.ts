import { z } from 'zod';

/**
 * services/zones/zones.schemas.ts — Zod validation schemas for zone endpoints.
 */

export const listZonesSchema = z.object({
  risk_level: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  district: z.string().max(100).optional(),
  active_only: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional(),
});

export type ListZonesQuery = z.infer<typeof listZonesSchema>;

export const zoneReportsSchema = z.object({
  status: z.enum(['pending', 'processing', 'complete', 'needs_human_review', 'failed']).optional(),
  risk_level: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ZoneReportsQuery = z.infer<typeof zoneReportsSchema>;
