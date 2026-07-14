import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { validate } from '../../middleware/validate.middleware';
import { authRateLimiter, emailOtpRateLimiter } from '../../middleware/rateLimit.middleware';
import {
  requestOtpSchema,
  verifyOtpSchema,
  loginSchema,
  refreshTokenSchema,
  registerStaffSchema,
} from './auth.schemas';
import {
  handleRequestOtp,
  handleVerifyOtp,
  handleLogin,
  handleRefreshToken,
  handleRegisterStaff,
  handleGetMe,
} from './auth.controller';

/**
 * services/auth/auth.routes.ts — Route definitions for all auth endpoints.
 *
 * Mounted at: /api/v1/auth
 *
 * Routes:
 *   POST /auth/otp/request          — Request OTP (community reporters; rate-limited)
 *   POST /auth/otp/verify           — Verify OTP + receive JWT tokens
 *   POST /auth/login                — Email/password login (PHI, NDCU, drone operator)
 *   POST /auth/refresh              — Refresh access token
 *   POST /auth/staff/register       — Register staff account (ndcu_admin only)
 *   GET  /auth/me                   — Get current user profile (any authenticated user)
 */

export const authRouter = Router();

// OTP flow — community reporters
authRouter.post(
  '/otp/request',
  emailOtpRateLimiter,
  validate(requestOtpSchema),
  handleRequestOtp,
);

authRouter.post(
  '/otp/verify',
  authRateLimiter,
  validate(verifyOtpSchema),
  handleVerifyOtp,
);

// Password login — staff roles
authRouter.post(
  '/login',
  authRateLimiter,
  validate(loginSchema),
  handleLogin,
);

// Token refresh — any holder of a valid refresh token
authRouter.post(
  '/refresh',
  validate(refreshTokenSchema),
  handleRefreshToken,
);

// Staff registration — ndcu_admin only
authRouter.post(
  '/staff/register',
  authenticate,
  requireRole('ndcu_admin'),
  validate(registerStaffSchema),
  handleRegisterStaff,
);

// Current user profile — any authenticated user
authRouter.get(
  '/me',
  authenticate,
  handleGetMe,
);
