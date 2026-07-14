import { PAGINATION } from '../config/constants';

/**
 * shared/pagination.util.ts — Reusable pagination helpers.
 * Used by list endpoints across reports, workorders, zones, chat history.
 */

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Parses raw query params into validated pagination values.
 * Clamps limit to MAX_LIMIT.
 */
export function parsePaginationParams(
  rawPage: unknown,
  rawLimit: unknown,
): PaginationParams {
  const page = Math.max(1, parseInt(String(rawPage ?? '1'), 10) || 1);
  const limit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, parseInt(String(rawLimit ?? String(PAGINATION.DEFAULT_LIMIT)), 10) || PAGINATION.DEFAULT_LIMIT),
  );
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * Builds a PaginatedResult from raw data + total count.
 */
export function buildPaginatedResult<T>(
  data: T[],
  total: number,
  params: PaginationParams,
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / params.limit);
  return {
    data,
    pagination: {
      total,
      page: params.page,
      limit: params.limit,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1,
    },
  };
}
