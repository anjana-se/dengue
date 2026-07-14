import crypto from 'crypto';
import {
  findUserByEmail,
  findUserByPhone,
  createUser,
  updateLastLogin,
} from '../../db/queries/users.queries';
import { createOtp, verifyOtp } from './otp.store';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../shared/jwt.util';
import {
  UnauthorizedError,
  BadRequestError,
  ConflictError,
  NotFoundError,
  ForbiddenError,
} from '../../shared/httpErrors';
import { logger } from '../../shared/logger';
import { ROLES } from '../../config/constants';
import type {
  RequestOtpInput,
  VerifyOtpInput,
  LoginInput,
  RefreshTokenInput,
  RegisterStaffInput,
} from './auth.schemas';
import type { User } from '../../types/domain.types';

/**
 * services/auth/auth.service.ts — Business logic for all auth flows.
 *
 * Flows:
 *  1. OTP (community reporters): requestOtp → verifyOtp → JWT issued
 *  2. Password login (PHI, NDCU admin, drone operator): email + password → JWT issued
 *  3. Token refresh: valid refresh token → new access token
 *  4. Staff registration: ndcu_admin creates PHI / drone_operator accounts
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hashPassword(password: string): string {
  // SHA-256 with a fixed prefix salt (simple; for production use bcrypt/argon2)
  // Using Node crypto to avoid adding bcrypt C++ bindings to the build.
  // TODO: swap for bcrypt or argon2 before production go-live.
  const salt = process.env.JWT_ACCESS_SECRET ?? 'dengue-salt';
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

function buildTokenPair(user: User) {
  const payload = { sub: user.id, role: user.role, email: user.email ?? undefined };
  return {
    access_token: signAccessToken(payload),
    refresh_token: signRefreshToken(payload),
    token_type: 'Bearer' as const,
    expires_in: 15 * 60, // 15 minutes in seconds
  };
}

function sanitizeUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    full_name: user.full_name,
    role: user.role,
    language_preference: user.language_preference,
    assigned_zone_id: user.assigned_zone_id,
    is_active: user.is_active,
  };
}

// ─── OTP flow (community reporters) ─────────────────────────────────────────

/**
 * Step 1: Request an OTP for a given phone number.
 * Auto-creates a community_reporter account if the phone hasn't been seen before.
 */
export async function requestOtpService(input: RequestOtpInput) {
  let user = await findUserByPhone(input.phone);

  if (!user) {
    // First-time user — auto-register as community_reporter
    if (!input.full_name) {
      throw new BadRequestError(
        'full_name is required when registering for the first time',
        'FULL_NAME_REQUIRED',
      );
    }
    user = await createUser({
      phone: input.phone,
      full_name: input.full_name,
      role: ROLES.COMMUNITY_REPORTER,
    });
    logger.info('New community reporter auto-registered', { userId: user.id });
  }

  if (!user.is_active) {
    throw new ForbiddenError('Account is deactivated', 'ACCOUNT_DEACTIVATED');
  }

  await createOtp(input.phone);
  return { message: 'OTP sent successfully', phone: input.phone };
}

/**
 * Step 2: Verify OTP and issue JWT tokens.
 */
export async function verifyOtpService(input: VerifyOtpInput) {
  const result = await verifyOtp(input.phone, input.code);

  if (!result.success) {
    const messages: Record<string, string> = {
      WRONG_CODE: 'Invalid OTP code',
      EXPIRED_OR_NOT_FOUND: 'OTP has expired, please request a new one',
      TOO_MANY_ATTEMPTS: 'Too many failed attempts, please request a new OTP',
    };
    throw new UnauthorizedError(
      messages[result.reason ?? ''] ?? 'OTP verification failed',
      result.reason ?? 'OTP_FAILED',
    );
  }

  const user = await findUserByPhone(input.phone);
  if (!user) throw new NotFoundError('User not found', 'USER_NOT_FOUND');
  if (!user.is_active) throw new ForbiddenError('Account is deactivated', 'ACCOUNT_DEACTIVATED');

  await updateLastLogin(user.id);
  logger.info('OTP login successful', { userId: user.id });

  return {
    ...buildTokenPair(user),
    user: sanitizeUser(user),
  };
}

// ─── Password login (PHI, NDCU admin, drone operator) ────────────────────────

export async function loginService(input: LoginInput) {
  const user = await findUserByEmail(input.email);

  if (!user || !user.password_hash) {
    throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  if (!user.is_active) {
    throw new ForbiddenError('Account is deactivated', 'ACCOUNT_DEACTIVATED');
  }

  if (!verifyPassword(input.password, user.password_hash)) {
    throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  // Community reporters use OTP, not password
  if (user.role === ROLES.COMMUNITY_REPORTER) {
    throw new ForbiddenError(
      'Community reporters must log in via OTP, not password',
      'WRONG_AUTH_METHOD',
    );
  }

  await updateLastLogin(user.id);
  logger.info('Password login successful', { userId: user.id, role: user.role });

  return {
    ...buildTokenPair(user),
    user: sanitizeUser(user),
  };
}

// ─── Token refresh ───────────────────────────────────────────────────────────

export async function refreshTokenService(input: RefreshTokenInput) {
  let payload;
  try {
    payload = verifyRefreshToken(input.refresh_token);
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
  }

  const { findUserById } = await import('../../db/queries/users.queries');
  const user = await findUserById(payload.sub);
  if (!user || !user.is_active) {
    throw new UnauthorizedError('User not found or deactivated', 'USER_INVALID');
  }

  return buildTokenPair(user);
}

// ─── Staff registration (NDCU admin only) ────────────────────────────────────

export async function registerStaffService(
  input: RegisterStaffInput,
  requestingUserRole: string,
) {
  if (requestingUserRole !== ROLES.NDCU_ADMIN) {
    throw new ForbiddenError('Only NDCU admins can register staff accounts', 'FORBIDDEN');
  }

  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new ConflictError(`Email '${input.email}' is already registered`, 'EMAIL_IN_USE');
  }

  const user = await createUser({
    email: input.email,
    password_hash: hashPassword(input.password),
    full_name: input.full_name,
    role: input.role,
    language_preference: input.language_preference,
  });

  logger.info('Staff user registered', { userId: user.id, role: user.role });
  return { user: sanitizeUser(user) };
}

// ─── Get current user (me) ────────────────────────────────────────────────────

export async function getMeService(userId: string) {
  const { findUserById } = await import('../../db/queries/users.queries');
  const user = await findUserById(userId);
  if (!user) throw new NotFoundError('User not found', 'USER_NOT_FOUND');
  return { user: sanitizeUser(user) };
}
