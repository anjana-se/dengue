import path from 'path';
import { Worker, Job } from 'bullmq';
import { config } from '../../config/env';
import { QUEUE_NAMES, RISK_LEVELS } from '../../config/constants';
import { logger } from '../../shared/logger';
import { analyzeBreedingSiteImage } from '../../integrations/gemini/visionAnalysis';
import { translateGuidanceTextBoth } from '../../integrations/gemini/translation';
import { resizeImage, cleanupProcessedFile } from '../../imageProcessing/resize.util';
import { updateReportAnalysis, updateReportStatus } from '../../db/queries/reports.queries';
import { createWorkOrder } from '../../db/queries/workorders.queries';
import { recomputeZoneRisk } from '../../services/zones/zones.service';
import {
  emitReportAnalysed,
  emitWorkOrderCreated,
  emitZoneUpdated,
} from '../../services/notifications/notifications.service';
import { findZoneById } from '../../db/queries/zones.queries';
import type { AiAnalysisJobData } from '../../types/domain.types';

/**
 * ai/queue/consumer.ts — BullMQ worker: the core AI processing loop.
 *
 * For each job:
 *  1. Mark report as 'processing'
 *  2. Download / locate image file
 *  3. Resize + strip EXIF (imageProcessing/resize.util)
 *  4. Call Gemini vision analysis
 *  5. Translate guidance text (si + ta in parallel)
 *  6. Apply confidence gate
 *  7. Persist analysis result to reports table
 *  8. If risk_level = high/critical AND confidence ≥ threshold → create work order
 *  9. Recompute zone risk score
 * 10. Emit realtime notifications (report:analysed, workorder:created, zone:updated)
 *
 * Retry policy: 3 attempts, exponential backoff (configured on the queue).
 * A job that exhausts retries leaves the report in 'failed' status.
 */

function computePriorityScore(
  riskLevel: string,
  confidenceScore: number,
): number {
  const riskWeight: Record<string, number> = {
    critical: 80,
    high: 50,
    medium: 20,
    low: 5,
  };
  const base = riskWeight[riskLevel] ?? 10;
  // Confidence scales the score: 0.70 confidence → 70% of base weight
  return Math.round(base * confidenceScore);
}

async function resolveLocalImagePath(imageUrl: string): Promise<string> {
  // For local storage, imageUrl is http://localhost:PORT/uploads/...
  // Convert back to a filesystem path
  const uploadsUrl = `/uploads/`;
  const idx = imageUrl.indexOf(uploadsUrl);
  if (idx !== -1) {
    const relativePath = imageUrl.slice(idx + uploadsUrl.length);
    return path.resolve(config.UPLOADS_DIR, relativePath);
  }
  // For S3 or external URLs, return as-is (visionAnalysis handles URLs too)
  // TODO: for S3 driver, download to temp file before processing
  return imageUrl;
}

async function processJob(job: Job<AiAnalysisJobData>): Promise<void> {
  const { report_id, image_url, language } = job.data;
  logger.info('Processing AI analysis job', { jobId: job.id, reportId: report_id });

  // ── 1. Mark as processing ────────────────────────────────────────────────
  await updateReportStatus(report_id, 'processing');

  let processedImagePath: string | null = null;

  try {
    // ── 2. Resolve image path ──────────────────────────────────────────────
    const imagePath = await resolveLocalImagePath(image_url);

    // ── 3. Resize + strip EXIF ─────────────────────────────────────────────
    const resized = await resizeImage(imagePath, { keepGps: false });
    processedImagePath = resized.outputPath;

    // ── 4. Gemini vision analysis ──────────────────────────────────────────
    const analysis = await analyzeBreedingSiteImage(processedImagePath, 'image/jpeg');

    // ── 5. Translate guidance text ─────────────────────────────────────────
    const translations = await translateGuidanceTextBoth(analysis.guidance_text);

    // ── 6 + 7. Persist analysis result ────────────────────────────────────
    const finalStatus = analysis.needs_human_review ? 'needs_human_review' : 'complete';

    const updatedReport = await updateReportAnalysis({
      report_id,
      status: finalStatus,
      site_type: analysis.site_type,
      risk_level: analysis.risk_level,
      confidence_score: analysis.confidence_score,
      ai_analysis: { ...analysis, language },
      guidance_text: analysis.guidance_text,
      guidance_text_si: translations.si || null,
      guidance_text_ta: translations.ta || null,
      breeding_indicators: analysis.breeding_indicators,
      remediation_action: analysis.remediation_action,
    });

    logger.info('Report analysis persisted', {
      reportId: report_id,
      status: finalStatus,
      riskLevel: analysis.risk_level,
      confidence: analysis.confidence_score,
    });

    // ── 8. Auto-create work order for high/critical reports ────────────────
    let workOrderId: string | null = null;
    const isHighRisk =
      analysis.risk_level === RISK_LEVELS.HIGH ||
      analysis.risk_level === RISK_LEVELS.CRITICAL;
    const aboveConfidenceGate = !analysis.needs_human_review;

    if (isHighRisk && aboveConfidenceGate) {
      const priorityScore = computePriorityScore(analysis.risk_level, analysis.confidence_score);
      const workOrder = await createWorkOrder({
        report_id,
        priority_score: priorityScore,
        remediation_action: analysis.remediation_action,
      });
      workOrderId = workOrder.id;
      logger.info('Work order auto-created', {
        workOrderId,
        reportId: report_id,
        priorityScore,
      });
    }

    // ── 9. Recompute zone risk ─────────────────────────────────────────────
    if (updatedReport.zone_id) {
      await recomputeZoneRisk(updatedReport.zone_id);

      const zone = await findZoneById(updatedReport.zone_id);
      if (zone) {
        emitZoneUpdated({
          zone_id: zone.id,
          risk_level: zone.risk_level,
          risk_score: zone.risk_score,
          active_report_count: zone.active_report_count,
        });
      }
    }

    // ── 10. Realtime notifications ─────────────────────────────────────────
    emitReportAnalysed({
      report_id,
      zone_id: updatedReport.zone_id,
      risk_level: updatedReport.risk_level,
      status: finalStatus,
    });

    if (workOrderId) {
      emitWorkOrderCreated({
        workorder_id: workOrderId,
        report_id,
        zone_id: updatedReport.zone_id,
        priority_score: computePriorityScore(analysis.risk_level, analysis.confidence_score),
      });
    }

  } catch (err) {
    // On unrecoverable error, mark report as failed
    const isLastAttempt = (job.attemptsMade + 1) >= (job.opts.attempts ?? 3);
    if (isLastAttempt) {
      await updateReportStatus(report_id, 'failed').catch(() => {});
      logger.error('AI analysis failed permanently', {
        reportId: report_id,
        error: (err as Error).message,
      });
    } else {
      logger.warn('AI analysis job failed, will retry', {
        reportId: report_id,
        attempt: job.attemptsMade + 1,
        error: (err as Error).message,
      });
    }
    throw err; // Let BullMQ handle retry
  } finally {
    // Always clean up the temp resized file
    if (processedImagePath) {
      await cleanupProcessedFile(processedImagePath);
    }
  }
}

let _worker: Worker<AiAnalysisJobData> | null = null;

/**
 * Starts the BullMQ worker. Called from src/worker.ts entry point.
 */
export function startWorker(): Worker<AiAnalysisJobData> {
  if (_worker) return _worker;

  _worker = new Worker<AiAnalysisJobData>(
    QUEUE_NAMES.AI_ANALYSIS,
    processJob,
    {
      connection: { url: config.REDIS_URL },
      concurrency: 3,          // Process up to 3 jobs simultaneously
      limiter: {
        max: 10,
        duration: 60_000,       // Max 10 Gemini calls per minute (rate limiting)
      },
    },
  );

  _worker.on('completed', (job) => {
    logger.info('AI analysis job completed', { jobId: job.id, reportId: job.data.report_id });
  });

  _worker.on('failed', (job, err) => {
    logger.error('AI analysis job failed', {
      jobId: job?.id,
      reportId: job?.data.report_id,
      error: err.message,
    });
  });

  _worker.on('error', (err) => {
    logger.error('BullMQ worker error', { error: err.message });
  });

  logger.info('AI analysis worker started', {
    queue: QUEUE_NAMES.AI_ANALYSIS,
    concurrency: 3,
  });

  return _worker;
}

/**
 * Graceful shutdown — drains in-progress jobs before exiting.
 */
export async function stopWorker(): Promise<void> {
  if (_worker) {
    await _worker.close();
    _worker = null;
    logger.info('AI analysis worker stopped');
  }
}
