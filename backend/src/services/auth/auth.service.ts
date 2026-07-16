import crypto from 'crypto';
import {
  findUserByEmail,
  createUser,
  updateLastLogin,
  findUserByGoogleId,
  updateUserGoogleId,
  listStaffUsers,
  updateUserDetails,
  toggleUserActive,
} from '../../db/queries/users.queries';
import { createOtp, verifyOtp } from './otp.store';
import { sendOtpEmail } from '../../integrations/email/client';
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
import { config } from '../../config/env';
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
 * Step 1: Request an OTP for a given email address.
 * Auto-creates a community_reporter account if the email hasn't been seen before.
 */
export async function requestOtpService(input: RequestOtpInput) {
  let user: User | null = await findUserByEmail(input.email);

  if (!user) {
    // First-time user — auto-register as community_reporter
    if (!input.full_name) {
      throw new BadRequestError(
        'full_name is required when registering for the first time',
        'FULL_NAME_REQUIRED',
      );
    }
    const newUser = await createUser({
      email: input.email,
      full_name: input.full_name,
      role: ROLES.COMMUNITY_REPORTER,
    });
    user = newUser;
    logger.info('New community reporter auto-registered via email', { userId: user.id });
  }

  if (!user.is_active) {
    throw new ForbiddenError('Account is deactivated', 'ACCOUNT_DEACTIVATED');
  }

  const code = await createOtp(input.email);
  await sendOtpEmail(input.email, code);

  return { message: 'OTP sent successfully to email', email: input.email };
}

/**
 * Step 2: Verify OTP and issue JWT tokens.
 */
export async function verifyOtpService(input: VerifyOtpInput) {
  const result = await verifyOtp(input.email, input.code);

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

  const user = await findUserByEmail(input.email);
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

// ─── List staff users (NDCU admin only) ──────────────────────────────────────

export async function listStaffService(requestingUserRole: string) {
  if (requestingUserRole !== ROLES.NDCU_ADMIN) {
    throw new ForbiddenError('Only NDCU admins can list staff accounts', 'FORBIDDEN');
  }
  const users = await listStaffUsers();
  return users;
}

// ─── Update staff user (NDCU admin only) ─────────────────────────────────────

export async function updateStaffService(
  targetUserId: string,
  input: { full_name?: string; email?: string; role?: string; password?: string; is_active?: boolean; assigned_zone_id?: string | null },
  requestingUserRole: string,
) {
  if (requestingUserRole !== ROLES.NDCU_ADMIN) {
    throw new ForbiddenError('Only NDCU admins can update staff accounts', 'FORBIDDEN');
  }

  const updates: Parameters<typeof updateUserDetails>[1] = {};
  if (input.full_name !== undefined) updates.full_name = input.full_name;
  if (input.email !== undefined) updates.email = input.email;
  if (input.role !== undefined) updates.role = input.role;
  if (input.assigned_zone_id !== undefined) updates.assigned_zone_id = input.assigned_zone_id;
  if (input.password !== undefined) updates.password_hash = hashPassword(input.password);

  await updateUserDetails(targetUserId, updates);

  if (input.is_active !== undefined) {
    await toggleUserActive(targetUserId, input.is_active);
  }

  const { findUserById } = await import('../../db/queries/users.queries');
  const user = await findUserById(targetUserId);
  if (!user) throw new NotFoundError('User not found', 'USER_NOT_FOUND');
  return { user: sanitizeUser(user) };
}

// ─── Get current user (me) ────────────────────────────────────────────────────

export async function getMeService(userId: string) {
  const { findUserById } = await import('../../db/queries/users.queries');
  const user = await findUserById(userId);
  if (!user) throw new NotFoundError('User not found', 'USER_NOT_FOUND');
  return { user: sanitizeUser(user) };
}

// ─── Google OAuth login ──────────────────────────────────────────────────────

interface GoogleTokenInfo {
  iss?: string;
  aud?: string;
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  error?: string;
  error_description?: string;
}

export async function loginWithGoogleService(idToken: string) {
  if (!idToken) {
    throw new BadRequestError('Google ID token is required', 'MISSING_GOOGLE_TOKEN');
  }

  let tokenInfo: GoogleTokenInfo;
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!res.ok) {
      const errBody = await res.text();
      logger.error('Google token verification failed', { status: res.status, body: errBody });
      throw new UnauthorizedError('Invalid Google ID token', 'INVALID_GOOGLE_TOKEN');
    }
    tokenInfo = await res.json() as GoogleTokenInfo;
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof BadRequestError) {
      throw err;
    }
    logger.error('Failed to verify Google token', { error: (err as Error).message });
    throw new UnauthorizedError('Google token verification failed', 'GOOGLE_VERIFICATION_FAILED');
  }

  if (tokenInfo.error) {
    throw new UnauthorizedError(`Google token error: ${tokenInfo.error_description || tokenInfo.error}`, 'GOOGLE_TOKEN_ERROR');
  }

  // Validate audience and issuer
  const clientId = config.GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) {
    logger.error('GOOGLE_OAUTH_CLIENT_ID is not configured in environment variables');
    throw new ForbiddenError('Google OAuth is not configured on the server', 'OAUTH_NOT_CONFIGURED');
  }

  if (tokenInfo.aud !== clientId) {
    logger.error('Google token aud mismatch', { expected: clientId, got: tokenInfo.aud });
    throw new UnauthorizedError('Google token audience mismatch', 'GOOGLE_TOKEN_AUDIENCE_MISMATCH');
  }

  const issuer = tokenInfo.iss || '';
  if (issuer !== 'accounts.google.com' && issuer !== 'https://accounts.google.com') {
    logger.error('Google token iss mismatch', { got: issuer });
    throw new UnauthorizedError('Google token issuer mismatch', 'GOOGLE_TOKEN_ISSUER_MISMATCH');
  }

  const isEmailVerified = tokenInfo.email_verified === 'true' || tokenInfo.email_verified === true;
  if (!isEmailVerified) {
    throw new UnauthorizedError('Google email is not verified', 'UNVERIFIED_GOOGLE_EMAIL');
  }

  const googleId = tokenInfo.sub;
  const email = tokenInfo.email;
  const name = tokenInfo.name || 'Google User';

  if (!googleId || !email) {
    throw new BadRequestError('Google token missing ID or email', 'INCOMPLETE_GOOGLE_TOKEN');
  }

  // Find user by Google ID or by email
  let user = await findUserByGoogleId(googleId);

  if (user) {
    // Already linked, update last login
    await updateLastLogin(user.id);
  } else {
    // Check if user exists by email
    const existing = await findUserByEmail(email);
    if (existing) {
      // Link the Google ID to the existing account
      await updateUserGoogleId(existing.id, googleId);
      await updateLastLogin(existing.id);
      user = {
        ...existing,
        google_oauth_id: googleId,
      };
    } else {
      // Create new community reporter user
      user = await createUser({
        email,
        full_name: name,
        role: ROLES.COMMUNITY_REPORTER,
        google_oauth_id: googleId,
      });
      logger.info('New community reporter registered via Google OAuth', { userId: user.id, email });
    }
  }

  if (!user) {
    throw new UnauthorizedError('User authentication failed', 'AUTH_FAILED');
  }

  if (!user.is_active) {
    throw new ForbiddenError('User account is deactivated', 'USER_DEACTIVATED');
  }

  const tokens = buildTokenPair(user);
  return {
    ...tokens,
    user: sanitizeUser(user),
  };
}
