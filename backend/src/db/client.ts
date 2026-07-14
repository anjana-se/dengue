import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config/env';
import { logger } from '../shared/logger';

/**
 * db/client.ts — Singleton pg Pool, PostGIS-aware query helpers.
 * All DB access goes through the exported `query()` and `transaction()` helpers.
 * Connection pooling is handled by pg's Pool (default max 10 connections).
 */

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle PostgreSQL client', { error: err.message });
  process.exit(1);
});

/**
 * Generic query helper.
 * Returns typed rows with QueryResult.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text: text.slice(0, 80), duration, rows: result.rowCount });
    return result;
  } catch (error) {
    logger.error('Query error', {
      text: text.slice(0, 80),
      params,
      error: (error as Error).message,
    });
    throw error;
  }
}

/**
 * Transaction helper — acquires a client, runs the callback, commits or rolls back.
 * Usage:
 *   const result = await transaction(async (client) => {
 *     await client.query('INSERT ...');
 *     return await client.query('SELECT ...');
 *   });
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Health-check helper — used by the API's /health route.
 */
export async function checkDbConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
