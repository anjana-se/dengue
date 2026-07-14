import { createClient } from 'redis';
import crypto from 'crypto';
import { config } from '../../config/env';
import { logger } from '../../shared/logger';

/**
 * services/auth/otp.store.ts — Redis-backed OTP storage with automatic TTL.
 *
 * Key pattern: `otp:{email}` → Hashed OTP code (string)
 * TTL: OTP_EXPIRES_IN_SECONDS (default 300 = 5 minutes)
 *
 * Uses SHA-256 to hash the code before saving to Redis to prevent exposure.
 */

// Shared Redis client — reused across OTP operations
let redisClient: ReturnType<typeof createClient> | null = null;

async function getRedisClient() {
  if (redisClient && redisClient.isReady) return redisClient;

  redisClient = createClient({ url: config.REDIS_URL });

  redisClient.on('error', (err: Error) => {
    logger.error('Redis client error (OTP store)', { error: err.message });
  });

  await redisClient.connect();
  logger.info('OTP Redis client connected');
  return redisClient;
}

function otpKey(email: string): string {
  return `otp:${email.toLowerCase().trim()}`;
}

function attemptKey(email: string): string {
  return `otp_attempts:${email.toLowerCase().trim()}`;
}

const MAX_VERIFY_ATTEMPTS = 5;

/**
 * Generates a numeric OTP of length OTP_LENGTH.
 */
function generateOtpCode(): string {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < config.OTP_LENGTH; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

/**
 * Hashes the raw code using SHA-256.
 */
function hashOtp(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Creates and stores an OTP hash for the given email.
 * Returns the raw generated OTP code (to be sent via email).
 */
export async function createOtp(email: string): Promise<string> {
  const client = await getRedisClient();
  const rawCode = generateOtpCode();
  const hashedCode = hashOtp(rawCode);

  await client.setEx(otpKey(email), config.OTP_EXPIRES_IN_SECONDS, hashedCode);
  // Reset attempt counter when a fresh OTP is issued
  await client.del(attemptKey(email));

  logger.debug('OTP hash created and stored in Redis', { email });
  return rawCode;
}

/**
 * Verifies an OTP code for the given email.
 * Returns true on success, false on wrong code.
 * Throws if the OTP has expired (key no longer in Redis) or max attempts exceeded.
 */
export async function verifyOtp(
  email: string,
  submittedCode: string,
): Promise<{ success: boolean; reason?: string }> {
  const client = await getRedisClient();

  // Check attempt count
  const attemptsRaw = await client.get(attemptKey(email));
  const attempts = parseInt(attemptsRaw ?? '0', 10);
  if (attempts >= MAX_VERIFY_ATTEMPTS) {
    return { success: false, reason: 'TOO_MANY_ATTEMPTS' };
  }

  const storedHash = await client.get(otpKey(email));
  if (!storedHash) {
    return { success: false, reason: 'EXPIRED_OR_NOT_FOUND' };
  }

  const submittedHash = hashOtp(submittedCode);

  if (storedHash !== submittedHash) {
    // Increment attempt counter; inherit remaining TTL from the OTP key
    const ttl = await client.ttl(otpKey(email));
    await client.setEx(attemptKey(email), ttl > 0 ? ttl : 60, String(attempts + 1));
    return { success: false, reason: 'WRONG_CODE' };
  }

  // Success — invalidate OTP so it can't be reused
  await client.del(otpKey(email));
  await client.del(attemptKey(email));
  return { success: true };
}

/**
 * Deletes an OTP (e.g. after successful login to prevent replay).
 */
export async function invalidateOtp(email: string): Promise<void> {
  const client = await getRedisClient();
  await client.del(otpKey(email));
  await client.del(attemptKey(email));
}

/**
 * Graceful disconnect — called during process shutdown.
 */
export async function disconnectOtpStore(): Promise<void> {
  if (redisClient?.isReady) {
    await redisClient.quit();
    logger.info('OTP Redis client disconnected');
  }
}
