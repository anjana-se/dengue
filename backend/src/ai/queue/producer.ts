import { aiAnalysisQueue } from './queue';
import { logger } from '../../shared/logger';
import type { AiAnalysisJobData } from '../../types/domain.types';

/**
 * ai/queue/producer.ts — Enqueue helper for the AI analysis queue.
 *
 * Called by reports.service and drone.service immediately after a report
 * row is inserted. Returns immediately (non-blocking) — the worker
 * process handles the job asynchronously.
 *
 * Job name: 'analyze-image' (used for filtering in BullMQ dashboard)
 */

export async function enqueueAnalysis(data: AiAnalysisJobData): Promise<string> {
  const job = await aiAnalysisQueue.add('analyze-image', data, {
    jobId: `report-${data.report_id}`, // idempotent — won't add duplicate if already queued
  });

  logger.debug('AI analysis job enqueued', {
    jobId: job.id,
    reportId: data.report_id,
  });

  return job.id ?? data.report_id;
}
