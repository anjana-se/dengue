import { Request, Response, NextFunction } from 'express';
import {
  requestOtpService,
  verifyOtpService,
  loginService,
  refreshTokenService,
  registerStaffService,
  getMeService,
} from './auth.service';
import type {
  RequestOtpInput,
  VerifyOtpInput,
  LoginInput,
  RefreshTokenInput,
  RegisterStaffInput,
} from './auth.schemas';

/**
 * services/auth/auth.controller.ts — Thin HTTP adapter layer.
 * Calls service functions and shapes the HTTP response.
 * No business logic here — all logic lives in auth.service.ts.
 */

export async function handleRequestOtp(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await requestOtpService(req.body as RequestOtpInput);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function handleVerifyOtp(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await verifyOtpService(req.body as VerifyOtpInput);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function handleLogin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await loginService(req.body as LoginInput);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function handleRefreshToken(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await refreshTokenService(req.body as RefreshTokenInput);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function handleRegisterStaff(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await registerStaffService(
      req.body as RegisterStaffInput,
      req.user?.role ?? '',
    );
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function handleGetMe(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      res.status(401).json({ success: false, error: { code: 'NO_USER', message: 'Not authenticated' } });
      return;
    }
    const result = await getMeService(userId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
