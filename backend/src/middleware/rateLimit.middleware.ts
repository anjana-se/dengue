import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { TooManyRequestsError } from '../shared/httpErrors';

/**
 * middleware/rateLimit.middleware.ts — Express rate limiting.
 * Different windows for auth endpoints vs general API.
 */

/** General API rate limiter — 200 requests per 15 minutes per IP */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, _res: Response, next: NextFunction) => {
    next(new TooManyRequestsError('Too many requests, please try again later', 'RATE_LIMITED'));
  },
});

/** Strict limiter for auth endpoints — 10 requests per 15 minutes per IP */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, _res: Response, next: NextFunction) => {
    next(new TooManyRequestsError('Too many auth attempts, please try again later', 'AUTH_RATE_LIMITED'));
  },
});

/** Strict rate limit per email for OTP requests — 3 requests per 5 minutes per email */
export const emailOtpRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // max 3 requests per email
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const email = req.body?.email;
    if (email && typeof email === 'string') {
      return `otp-email:${email.toLowerCase().trim()}`;
    }
    return req.ip ?? 'anonymous';
  },
  handler: (_req: Request, _res: Response, next: NextFunction) => {
    next(new TooManyRequestsError('Too many OTP requests for this email address. Please try again in 5 minutes.', 'OTP_EMAIL_RATE_LIMITED'));
  },
});
