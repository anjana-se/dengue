import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../shared/httpErrors';
import { logger } from '../shared/logger';
import { isDev } from '../config/env';

/**
 * middleware/errorHandler.middleware.ts — Global error handler.
 * Must be registered last in app.ts (after all routes).
 * Converts all thrown errors to a consistent JSON response shape.
 *
 * Response shape:
 * {
 *   "success": false,
 *   "error": {
 *     "code": "NOT_FOUND",
 *     "message": "Report not found",
 *     "details": { ... }   // only when available
 *   }
 * }
 */

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  // Known HTTP error (thrown by services)
  if (err instanceof HttpError) {
    logger.warn('HTTP error', {
      statusCode: err.statusCode,
      code: err.code,
      message: err.message,
      path: req.path,
    });

    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code ?? 'HTTP_ERROR',
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    });
    return;
  }

  // Zod validation error (shouldn't reach here if validate.middleware is used,
  // but belt-and-suspenders)
  if (err instanceof ZodError) {
    res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: err.flatten().fieldErrors,
      },
    });
    return;
  }

  // Multer errors (file size, file type)
  const multerErr = err as { code?: string; message?: string; field?: string };
  if (multerErr.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({
      success: false,
      error: { code: 'FILE_TOO_LARGE', message: 'Uploaded file exceeds size limit' },
    });
    return;
  }

  // Unknown / unexpected errors
  logger.error('Unhandled error', {
    message: (err as Error)?.message,
    stack: isDev ? (err as Error)?.stack : undefined,
    path: req.path,
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      ...(isDev && err instanceof Error ? { stack: err.stack } : {}),
    },
  });
}
