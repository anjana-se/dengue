import { Request, Response, NextFunction } from 'express';
import {
  createMissionService,
  listMissionsService,
  getMissionByIdService,
  updateMissionStatusService,
  uploadDroneFrameService,
} from './drone.service';
import { BadRequestError } from '../../shared/httpErrors';
import type {
  CreateMissionInput,
  UpdateMissionStatusInput,
  ListMissionsQuery,
} from './drone.schemas';

export async function handleCreateMission(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const mission = await createMissionService(req.body as CreateMissionInput, req.user!.sub, req.user!.role);
    res.status(201).json({ success: true, data: mission });
  } catch (err) { next(err); }
}

export async function handleListMissions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await listMissionsService(req.query as unknown as ListMissionsQuery, req.user!.role, req.user!.sub);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function handleGetMission(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const mission = await getMissionByIdService(String(req.params.id), req.user!.sub, req.user!.role);
    res.status(200).json({ success: true, data: mission });
  } catch (err) { next(err); }
}

export async function handleUpdateMissionStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const mission = await updateMissionStatusService(
      String(req.params.id), req.body as UpdateMissionStatusInput, req.user!.sub, req.user!.role,
    );
    res.status(200).json({ success: true, data: mission });
  } catch (err) { next(err); }
}

export async function handleUploadDroneFrame(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) throw new BadRequestError('A frame image is required', 'IMAGE_REQUIRED');
    const result = await uploadDroneFrameService(
      String(req.params.id), req.file.path, req.file.mimetype, req.user!.sub, req.user!.role,
    );
    res.status(202).json({ success: true, data: result });
  } catch (err) { next(err); }
}
