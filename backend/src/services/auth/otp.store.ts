import { createClient } from 'redis';
import { config } from '../../config/env';
import { logger } from '../../shared/logger';

/**
 * services/auth/otp.store.ts — Redis-backed OTP storage with automatic TTL.
 *
 * Key pattern: `otp:{phone}` → OTP code (string)
 * TTL: OTP_EXPIRES_IN_SECONDS (default 300 = 5 minutes)
 *
 * Using Redis for OTPs means:
 *  - No cleanup cron needed — Redis evicts expired keys automatically
 *  - OTPs are never persisted to the main Postgres DB (separation of concerns)
 *
 * SMS delivery: this module stores + verifies OTPs.
 * Actual SMS sending is stubbed — wire in your chosen provider
 * (Twilio, Vonage, AWS SNS, Dialog, Mobitel, etc.) in sendOtp().
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

function otpKey(phone: string): string {
  return `otp:${phone}`;
}

function attemptKey(phone: string): string {
  return `otp_attempts:${phone}`;
}

const MAX_VERIFY_ATTEMPTS = 5;

/**
 * Generates a numeric OTP of length OTP_LENGTH.
 */
function generateOtp(): string {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < config.OTP_LENGTH; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

/**
 * Creates and stores an OTP for the given phone number.
 * Returns the generated OTP so the caller can send it via SMS.
 * Overwrites any existing OTP for the same phone (rate limiting is handled separately).
 */
export async function createOtp(phone: string): Promise<string> {
  const client = await getRedisClient();
  const otp = generateOtp();

  await client.setEx(otpKey(phone), config.OTP_EXPIRES_IN_SECONDS, otp);
  // Reset attempt counter when a fresh OTP is issued
  await client.del(attemptKey(phone));

  logger.debug('OTP created', { phone: phone.slice(0, 5) + '***' });

  // ─── SMS delivery stub ─────────────────────────────────────────────────────
  // Replace this block with your chosen SMS provider SDK call.
  // Example (Twilio):
  //   await twilioClient.messages.create({
  //     body: `Your DengueGuard verification code is ${otp}`,
  //     from: process.env.TWILIO_PHONE_NUMBER,
  //     to: phone,
  //   });
  if (config.NODE_ENV !== 'production') {
    logger.warn(`[DEV ONLY] OTP for ${phone.slice(0, 5)}***: ${otp}`);
  }

  return otp;
}

/**
 * Verifies an OTP for the given phone number.
 * Returns true on success, false on wrong code.
 * Throws if the OTP has expired (key no longer in Redis) or max attempts exceeded.
 */
export async function verifyOtp(
  phone: string,
  submittedCode: string,
): Promise<{ success: boolean; reason?: string }> {
  const client = await getRedisClient();

  // Check attempt count
  const attemptsRaw = await client.get(attemptKey(phone));
  const attempts = parseInt(attemptsRaw ?? '0', 10);
  if (attempts >= MAX_VERIFY_ATTEMPTS) {
    return { success: false, reason: 'TOO_MANY_ATTEMPTS' };
  }

  const stored = await client.get(otpKey(phone));
  if (!stored) {
    return { success: false, reason: 'EXPIRED_OR_NOT_FOUND' };
  }

  if (stored !== submittedCode) {
    // Increment attempt counter; inherit remaining TTL from the OTP key
    const ttl = await client.ttl(otpKey(phone));
    await client.setEx(attemptKey(phone), ttl, String(attempts + 1));
    return { success: false, reason: 'WRONG_CODE' };
  }

  // Success — invalidate OTP so it can't be reused
  await client.del(otpKey(phone));
  await client.del(attemptKey(phone));
  return { success: true };
}

/**
 * Deletes an OTP (e.g. after successful login to prevent replay).
 */
export async function invalidateOtp(phone: string): Promise<void> {
  const client = await getRedisClient();
  await client.del(otpKey(phone));
  await client.del(attemptKey(phone));
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
