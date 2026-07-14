import { Request, Response, NextFunction } from 'express';
import {
  createReportService,
  listReportsService,
  getReportByIdService,
  reviewReportService,
} from './reports.service';
import type { CreateReportInput, ListReportsQuery, ReviewReportInput } from './reports.schemas';
import { BadRequestError } from '../../shared/httpErrors';

/**
 * services/reports/reports.controller.ts — HTTP adapter for reports.
 * Extracts multipart file from req.file, body fields from req.body,
 * then delegates all logic to reports.service.
 */

export async function handleCreateReport(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.file) {
      throw new BadRequestError('An image file is required', 'IMAGE_REQUIRED');
    }

    const body = req.body as CreateReportInput;
    const report = await createReportService({
      ...body,
      filePath: req.file.path,
      mimeType: req.file.mimetype,
      reporterId: req.user!.sub,
      sourceType: 'community',
    });

    res.status(202).json({
      success: true,
      data: {
        report_id: report.id,
        status: report.status,
        message: 'Report received. AI analysis is in progress.',
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function handleListReports(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await listReportsService(
      req.query as unknown as ListReportsQuery,
      req.user!.role,
      req.user!.sub,
    );
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function handleGetReport(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const report = await getReportByIdService(
      String(req.params.id),
      req.user!.sub,
      req.user!.role,
    );
    res.status(200).json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
}

export async function handleReviewReport(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const report = await reviewReportService(
      String(req.params.id),
      req.body as ReviewReportInput,
      req.user!.sub,
    );
    res.status(200).json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
}
