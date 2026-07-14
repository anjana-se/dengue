import { Request, Response, NextFunction } from 'express';
import {
  listZonesService,
  getZoneByIdService,
  getZoneReportsService,
} from './zones.service';
import type { ListZonesQuery, ZoneReportsQuery } from './zones.schemas';

/**
 * services/zones/zones.controller.ts — HTTP adapter for zones.
 */

export async function handleListZones(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const zones = await listZonesService(req.query as unknown as ListZonesQuery);
    res.status(200).json({ success: true, data: zones });
  } catch (err) { next(err); }
}

export async function handleGetZone(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const zone = await getZoneByIdService(String(req.params.id));
    res.status(200).json({ success: true, data: zone });
  } catch (err) { next(err); }
}

export async function handleGetZoneReports(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const result = await getZoneReportsService(
      String(req.params.id),
      req.query as unknown as ZoneReportsQuery,
    );
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
}
