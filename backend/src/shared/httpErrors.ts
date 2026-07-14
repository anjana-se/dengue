/**
 * shared/httpErrors.ts — Typed HTTP error classes.
 * Used by services to throw structured errors that errorHandler.middleware
 * catches and converts to consistent JSON responses.
 */

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    // Restore prototype chain (required when extending built-ins in TS)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BadRequestError extends HttpError {
  constructor(message = 'Bad request', code?: string, details?: unknown) {
    super(400, message, code, details);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Unauthorized', code?: string) {
    super(401, message, code);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'Forbidden', code?: string) {
    super(403, message, code);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Not found', code?: string) {
    super(404, message, code);
  }
}

export class ConflictError extends HttpError {
  constructor(message = 'Conflict', code?: string) {
    super(409, message, code);
  }
}

export class UnprocessableEntityError extends HttpError {
  constructor(message = 'Unprocessable entity', code?: string, details?: unknown) {
    super(422, message, code, details);
  }
}

export class TooManyRequestsError extends HttpError {
  constructor(message = 'Too many requests', code?: string) {
    super(429, message, code);
  }
}

export class InternalServerError extends HttpError {
  constructor(message = 'Internal server error', code?: string) {
    super(500, message, code);
  }
}

export class ServiceUnavailableError extends HttpError {
  constructor(message = 'Service unavailable', code?: string) {
    super(503, message, code);
  }
}
