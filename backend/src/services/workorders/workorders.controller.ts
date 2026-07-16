import { Request, Response, NextFunction } from 'express';
import {
  listWorkordersService,
  getWorkorderByIdService,
  createWorkorderService,
  acceptWorkorderService,
  assignWorkorderService,
  resolveWorkorderService,
  cancelWorkorderService,
} from './workorders.service';
import { getStorage } from '../../storage';
import type {
  ListWorkordersQuery,
  CreateWorkorderInput,
  AcceptWorkorderInput,
  ResolveWorkorderInput,
  AssignWorkorderInput,
} from './workorders.schemas';

/**
 * services/workorders/workorders.controller.ts — HTTP adapter for workorders.
 */

export async function handleListWorkorders(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const result = await listWorkordersService(
      req.query as unknown as ListWorkordersQuery,
      req.user!.role,
      req.user!.sub,
    );
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function handleGetWorkorder(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const wo = await getWorkorderByIdService(
      String(req.params.id), req.user!.sub, req.user!.role,
    );
    res.status(200).json({ success: true, data: wo });
  } catch (err) { next(err); }
}

export async function handleCreateWorkorder(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const wo = await createWorkorderService(
      req.body as CreateWorkorderInput, req.user!.role,
    );
    res.status(201).json({ success: true, data: wo });
  } catch (err) { next(err); }
}

export async function handleAcceptWorkorder(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const wo = await acceptWorkorderService(
      String(req.params.id),
      req.body as AcceptWorkorderInput,
      req.user!.sub,
      req.user!.role,
    );
    res.status(200).json({ success: true, data: wo });
  } catch (err) { next(err); }
}

export async function handleAssignWorkorder(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const wo = await assignWorkorderService(
      String(req.params.id),
      req.body as AssignWorkorderInput,
      req.user!.role,
      req.user!.sub,
    );
    res.status(200).json({ success: true, data: wo });
  } catch (err) { next(err); }
}

export async function handleResolveWorkorder(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    // Optional follow-up image (proof of remediation)
    let followUpImageUrl: string | undefined;
    let followUpImageKey: string | undefined;
    if (req.file) {
      const storage = getStorage();
      const destKey = `workorders/${String(req.params.id)}/followup-${Date.now()}.jpg`;
      const result = await storage.upload(req.file.path, destKey, req.file.mimetype);
      followUpImageUrl = result.url;
      followUpImageKey = result.key;
    }

    const wo = await resolveWorkorderService(
      String(req.params.id),
      req.body as ResolveWorkorderInput,
      req.user!.sub,
      req.user!.role,
      followUpImageUrl,
      followUpImageKey,
    );
    res.status(200).json({ success: true, data: wo });
  } catch (err) { next(err); }
}

export async function handleCancelWorkorder(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const wo = await cancelWorkorderService(
      String(req.params.id), req.user!.role,
    );
    res.status(200).json({ success: true, data: wo });
  } catch (err) { next(err); }
}
