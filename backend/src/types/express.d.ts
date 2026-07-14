import { JwtPayload } from '../shared/jwt.util';

/**
 * types/express.d.ts — Extends Express Request with req.user.
 * Once auth.middleware attaches the decoded JWT payload, every
 * route handler can access req.user with full TypeScript types.
 */

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export {};
