import { z } from 'zod';

/**
 * services/drone/drone.schemas.ts — Zod validation for drone mission endpoints.
 */

export const createMissionSchema = z.object({
  zone_id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  planned_area: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
});

export type CreateMissionInput = z.infer<typeof createMissionSchema>;

export const updateMissionStatusSchema = z.object({
  status: z.enum(['in_progress', 'complete', 'completed']),
  notes: z.string().max(1000).optional(),
});

export type UpdateMissionStatusInput = z.infer<typeof updateMissionStatusSchema>;

export const listMissionsSchema = z.object({
  status: z.enum(['in_progress', 'complete', 'completed']).optional(),
  zone_id: z.string().uuid().optional(),
  operator_id: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ListMissionsQuery = z.infer<typeof listMissionsSchema>;
