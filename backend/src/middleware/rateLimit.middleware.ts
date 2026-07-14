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
