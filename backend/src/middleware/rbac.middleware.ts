import { Request, Response, NextFunction } from 'express';
import { Role } from '../config/constants';
import { ForbiddenError, UnauthorizedError } from '../shared/httpErrors';

/**
 * middleware/rbac.middleware.ts — Role-based access control guard.
 * Returns a middleware that allows only the listed roles through.
 *
 * Usage (in route files):
 *   router.get('/dashboard/summary', authenticate, requireRole('ndcu_admin'), handler);
 *   router.get('/reports', authenticate, requireRole('phi', 'ndcu_admin'), handler);
 */

export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required', 'NO_USER'));
    }

    if (!allowedRoles.includes(req.user.role as Role)) {
      return next(
        new ForbiddenError(
          `Role '${req.user.role}' is not allowed to access this resource. Required: ${allowedRoles.join(' | ')}`,
          'INSUFFICIENT_ROLE',
        ),
      );
    }

    next();
  };
}
