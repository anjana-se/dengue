import { query } from '../client';
import { User } from '../../types/domain.types';

/**
 * db/queries/users.queries.ts — Thin, typed query functions for the users table.
 * No business logic here — only SQL access.
 * All business logic lives in the service layer.
 */

export async function findUserById(id: string): Promise<User | null> {
  const result = await query<User>(
    `SELECT id, email, phone, full_name, role, is_active, language_preference,
            assigned_zone_id, google_oauth_id, last_login_at, created_at, updated_at
     FROM users WHERE id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function findUserByEmail(email: string): Promise<(User & { password_hash: string | null }) | null> {
  const result = await query<User & { password_hash: string | null }>(
    `SELECT id, email, phone, password_hash, full_name, role, is_active,
            language_preference, assigned_zone_id, google_oauth_id, last_login_at,
            created_at, updated_at
     FROM users WHERE email = $1`,
    [email],
  );
  return result.rows[0] ?? null;
}

export async function findUserByPhone(phone: string): Promise<User | null> {
  const result = await query<User>(
    `SELECT id, email, phone, full_name, role, is_active, language_preference,
            assigned_zone_id, google_oauth_id, last_login_at, created_at, updated_at
     FROM users WHERE phone = $1`,
    [phone],
  );
  return result.rows[0] ?? null;
}

export async function findUserByGoogleId(googleId: string): Promise<User | null> {
  const result = await query<User>(
    `SELECT id, email, phone, full_name, role, is_active, language_preference,
            assigned_zone_id, google_oauth_id, last_login_at, created_at, updated_at
     FROM users WHERE google_oauth_id = $1`,
    [googleId],
  );
  return result.rows[0] ?? null;
}

export interface CreateUserInput {
  email?: string;
  phone?: string;
  password_hash?: string;
  full_name: string;
  role: string;
  language_preference?: string;
  google_oauth_id?: string;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const result = await query<User>(
    `INSERT INTO users (email, phone, password_hash, full_name, role, language_preference, google_oauth_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, email, phone, full_name, role, is_active, language_preference,
               assigned_zone_id, google_oauth_id, last_login_at, created_at, updated_at`,
    [
      input.email ?? null,
      input.phone ?? null,
      input.password_hash ?? null,
      input.full_name,
      input.role,
      input.language_preference ?? 'en',
      input.google_oauth_id ?? null,
    ],
  );
  return result.rows[0];
}

export async function updateLastLogin(userId: string): Promise<void> {
  await query(
    `UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [userId],
  );
}

export async function updateUserPassword(userId: string, passwordHash: string): Promise<void> {
  await query(
    `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
    [passwordHash, userId],
  );
}

export async function deactivateUser(userId: string): Promise<void> {
  await query(
    `UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = $1`,
    [userId],
  );
}

export async function updateUserGoogleId(userId: string, googleId: string): Promise<void> {
  await query(
    `UPDATE users SET google_oauth_id = $1, updated_at = NOW() WHERE id = $2`,
    [googleId, userId],
  );
}
