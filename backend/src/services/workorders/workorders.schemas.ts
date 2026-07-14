import { z } from 'zod';

/**
 * services/workorders/workorders.schemas.ts — Zod validation schemas for workorder endpoints.
 */

// ─── List work orders ─────────────────────────────────────────────────────────

export const listWorkordersSchema = z.object({
  status: z.enum(['open', 'accepted', 'resolved', 'cancelled']).optional(),
  zone_id: z.string().uuid().optional(),
  assigned_to: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ListWorkordersQuery = z.infer<typeof listWorkordersSchema>;

// ─── Create work order (manual — NDCU admin) ──────────────────────────────────

export const createWorkorderSchema = z.object({
  report_id: z.string().uuid('report_id must be a valid UUID'),
  assigned_to: z.string().uuid().optional(),
  priority_score: z.coerce.number().int().min(0).max(100).default(50),
  remediation_action: z
    .enum([
      'drain_water', 'remove_container', 'apply_larvicide',
      'cover_container', 'clear_drain', 'spray_insecticide',
      'public_notice', 'other',
    ])
    .optional(),
  notes: z.string().max(1000).optional(),
});

export type CreateWorkorderInput = z.infer<typeof createWorkorderSchema>;

// ─── Accept work order (PHI) ──────────────────────────────────────────────────

export const acceptWorkorderSchema = z.object({
  notes: z.string().max(500).optional(),
});

export type AcceptWorkorderInput = z.infer<typeof acceptWorkorderSchema>;

// ─── Resolve work order (PHI) ─────────────────────────────────────────────────

export const resolveWorkorderSchema = z.object({
  resolution_notes: z.string().min(10, 'Please describe the remediation action taken').max(2000),
  // PHI can override AI risk level if field inspection differs
  verified_risk_level: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

export type ResolveWorkorderInput = z.infer<typeof resolveWorkorderSchema>;

// ─── Assign work order (NDCU admin) ──────────────────────────────────────────

export const assignWorkorderSchema = z.object({
  assigned_to: z.string().uuid('assigned_to must be a valid UUID'),
});

export type AssignWorkorderInput = z.infer<typeof assignWorkorderSchema>;
