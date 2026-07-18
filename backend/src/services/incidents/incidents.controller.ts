import { Request, Response, NextFunction } from 'express';
import * as incidentsService from './incidents.service';

export async function listIncidents(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, page, limit } = req.query;
    const result = await incidentsService.listIncidents({
      status: status as string,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function getIncidentById(req: Request, res: Response, next: NextFunction) {
  try {
    const detail = await incidentsService.getIncidentDetail(req.params.id as string);
    if (!detail) {
      res.status(404).json({ success: false, error: { message: 'Incident not found' } });
      return;
    }
    res.json({ success: true, data: detail });
  } catch (error) {
    next(error);
  }
}

export async function fetchDuplicateDecisions(req: Request, res: Response, next: NextFunction) {
  try {
    const decisions = await incidentsService.fetchDuplicateDecisions(req.params.id as string);
    res.json({ success: true, data: decisions });
  } catch (error) {
    next(error);
  }
}

export async function resolveDuplicateDecision(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.id;
    const { action, notes } = req.body;
    const result = await incidentsService.resolveDuplicateDecision(
      req.params.id as string,
      action,
      userId,
      notes
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function listDecisions(req: Request, res: Response, next: NextFunction) {
  try {
    const { status } = req.query;
    const decisions = await incidentsService.listDecisions({ status: status as string });
    res.json({ success: true, data: decisions });
  } catch (error) {
    next(error);
  }
}

export async function updateIncidentStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { status } = req.body;
    const result = await incidentsService.updateIncidentStatus(req.params.id as string, status);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}


