import { Request, Response, NextFunction } from 'express';
import { sendMessageService, listSessionsService, getSessionHistoryService } from './chat.service';
import type { SendMessageInput, ListSessionsQuery } from './chat.schemas';

export async function handleSendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await sendMessageService(req.body as SendMessageInput, req.user!.sub);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function handleListSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await listSessionsService(req.query as unknown as ListSessionsQuery, req.user!.sub);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function handleGetSessionHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await getSessionHistoryService(String(req.params.id), req.user!.sub);
    res.status(200).json({ success: true, data: result });
  } catch (err) { next(err); }
}
