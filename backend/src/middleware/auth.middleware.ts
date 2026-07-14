import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../shared/jwt.util';
import { UnauthorizedError } from '../shared/httpErrors';

/**
 * middleware/auth.middleware.ts — Verifies JWT, attaches req.user.
 * Must be applied before any route that needs authentication.
 * Throws UnauthorizedError (→ 401) if token is missing or invalid.
 */

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or malformed Authorization header', 'NO_TOKEN'));
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired access token', 'INVALID_TOKEN'));
  }
}
