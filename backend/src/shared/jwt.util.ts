import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/env';

/**
 * shared/jwt.util.ts — JWT sign + verify.
 * Used by: auth.service (issuing), auth.middleware (verifying HTTP),
 * socket.server (verifying WebSocket handshake).
 * Kept separate from auth.service so all three callers can import it
 * without circular dependencies.
 */

export interface JwtPayload {
  sub: string;       // user_id (UUID)
  role: string;      // user's role
  email?: string;
  phone?: string;
  iat?: number;
  exp?: number;
}

export function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, config.JWT_ACCESS_SECRET, {
    expiresIn: config.JWT_ACCESS_EXPIRES_IN,
  } as SignOptions);
}

export function signRefreshToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRES_IN,
  } as SignOptions);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, config.JWT_ACCESS_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, config.JWT_REFRESH_SECRET) as JwtPayload;
}
