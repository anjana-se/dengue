import { Request, Response, NextFunction } from 'express';
import * as casesService from './cases.service';

export async function listCases(req: Request, res: Response, next: NextFunction) {
  try {
    const { zone_id, severity, page, limit } = req.query;
    const result = await casesService.listCases({
      zone_id: zone_id as string,
      severity: severity as string,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function getCaseHeatmap(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await casesService.getCaseHeatmap();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
