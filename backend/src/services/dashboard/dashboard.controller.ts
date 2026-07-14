import { Request, Response, NextFunction } from 'express';
import { getDashboardSummaryService, exportReportsCsvService } from './dashboard.service';

export async function handleDashboardSummary(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getDashboardSummaryService();
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function handleExportCsv(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { zone_id, risk_level, date_from, date_to } = _req.query as Record<string, string | undefined>;
    const csv = await exportReportsCsvService({ zone_id, risk_level, date_from, date_to });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="dengue-reports-${Date.now()}.csv"`);
    res.status(200).send(csv);
  } catch (err) { next(err); }
}
