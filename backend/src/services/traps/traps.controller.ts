import { Request, Response, NextFunction } from 'express';
import * as trapsService from './traps.service';

export async function listTraps(req: Request, res: Response, next: NextFunction) {
  try {
    const { zone_id, status } = req.query;
    const data = await trapsService.listTraps({
      zone_id: zone_id as string,
      status: status as string,
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getTrapById(req: Request, res: Response, next: NextFunction) {
  try {
    const trap = await trapsService.getTrapById(req.params.id as string);
    if (!trap) {
      res.status(404).json({ success: false, error: { message: 'Trap not found' } });
      return;
    }
    res.json({ success: true, data: trap });
  } catch (error) {
    next(error);
  }
}

export async function getTrapReadings(req: Request, res: Response, next: NextFunction) {
  try {
    const { days } = req.query;
    const data = await trapsService.getTrapReadings(
      req.params.id as string,
      days ? parseInt(days as string, 10) : undefined
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
