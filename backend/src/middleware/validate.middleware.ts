import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { UnprocessableEntityError } from '../shared/httpErrors';

/**
 * middleware/validate.middleware.ts — Generic Zod request validation wrapper.
 * Validates req.body, req.params, or req.query against a Zod schema.
 * Throws UnprocessableEntityError (422) with structured field errors on failure.
 *
 * Usage:
 *   router.post('/reports', validate(createReportSchema), handler);
 *   router.get('/reports', validate(listReportsSchema, 'query'), handler);
 */

type RequestPart = 'body' | 'params' | 'query';

export function validate(schema: ZodSchema, part: RequestPart = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      const zodError = result.error as ZodError;
      return next(
        new UnprocessableEntityError(
          'Validation failed',
          'VALIDATION_ERROR',
          zodError.flatten().fieldErrors,
        ),
      );
    }
    // Replace with the parsed (coerced) version so downstream code gets typed data
    (req as unknown as Record<string, unknown>)[part] = result.data;
    next();
  };
}
