import { z } from 'zod';

/**
 * services/auth/auth.schemas.ts — Zod validation schemas for all auth endpoints.
 * Used by validate.middleware to validate request bodies before they reach the controller.
 */

// ─── OTP flow (community reporters) ─────────────────────────────────────────

export const requestOtpSchema = z.object({
  phone: z
    .string()
    .min(7, 'Phone number too short')
    .max(20, 'Phone number too long')
    .regex(/^\+?[0-9\s\-().]+$/, 'Invalid phone number format'),
  full_name: z.string().min(2).max(100).optional(),
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;

export const verifyOtpSchema = z.object({
  phone: z
    .string()
    .min(7)
    .max(20)
    .regex(/^\+?[0-9\s\-().]+$/),
  code: z
    .string()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d+$/, 'OTP must contain digits only'),
});

export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

// ─── Password login (PHI, NDCU admin) ───────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ─── Token refresh ───────────────────────────────────────────────────────────

export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

// ─── Registration (staff — PHI / NDCU; community self-registers via OTP) ────

export const registerStaffSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  full_name: z.string().min(2).max(100),
  role: z.enum(['phi', 'ndcu_admin', 'drone_operator']),
  language_preference: z.enum(['en', 'si', 'ta']).default('en'),
  assigned_zone_id: z.string().uuid().optional(),
});

export type RegisterStaffInput = z.infer<typeof registerStaffSchema>;
