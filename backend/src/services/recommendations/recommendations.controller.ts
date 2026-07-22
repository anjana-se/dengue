import { Request, Response, NextFunction } from 'express';
import { listRecommendationsService } from './recommendations.service';


export async function handleListRecommendations(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const rawLimit = Number(req.query.limit);
    const limit = Number.isInteger(rawLimit) && rawLimit > 0 && rawLimit <= 20 ? rawLimit : 5;
    const recommendations = await listRecommendationsService(limit);
    res.status(200).json({ success: true, data: recommendations });
  } catch (err) { next(err); }
}
