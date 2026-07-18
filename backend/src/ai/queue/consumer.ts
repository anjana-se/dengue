import path from 'path';
import fs from 'fs';
import os from 'os';
import { Worker, Job } from 'bullmq';
import { config } from '../../config/env';
import { QUEUE_NAMES, RISK_LEVELS } from '../../config/constants';
import { logger } from '../../shared/logger';
import { analyzeBreedingSiteImage } from '../../integrations/gemini/visionAnalysis';
import { analyzeBreedingSiteImageNvidia } from '../../integrations/nvidia/visionAnalysis';
import { resizeImage, cleanupProcessedFile } from '../../imageProcessing/resize.util';
import { updateReportAnalysis, updateReportStatus, findReportById, updateReportIncident } from '../../db/queries/reports.queries';
import { createWorkOrder } from '../../db/queries/workorders.queries';
import { recomputeZoneRisk } from '../../services/zones/zones.service';
import {
  emitReportAnalysed,
  emitWorkOrderCreated,
  emitZoneUpdated,
} from '../../services/notifications/notifications.service';
import { findZoneById } from '../../db/queries/zones.queries';
import { findNearbyIncident, createIncident, createDecision, updateIncidentStats } from '../../db/queries/incidents.queries';
import { compareReportsNvidia } from '../../integrations/nvidia/duplicateComparison';
import { getIO } from '../../services/notifications/socket.server';
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

async function resolveLocalImagePath(imageUrl: string): Promise<{ localPath: string; isTemp: boolean }> {
  // For local storage, imageUrl is http://localhost:PORT/uploads/...
  // Convert back to a filesystem path
  const uploadsUrl = `/uploads/`;
  const idx = imageUrl.indexOf(uploadsUrl);
  if (idx !== -1) {
    const relativePath = imageUrl.slice(idx + uploadsUrl.length);
    return {
      localPath: path.resolve(config.UPLOADS_DIR, relativePath),
      isTemp: false,
    };
  }

  // For S3 or external URLs, download to a local temp file first
  logger.info('Downloading S3/external image to local temp file...', { imageUrl });
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image from S3/external URL: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const tempDir = os.tmpdir();
  const tempPath = path.join(
    tempDir,
    `dengueguard-s3-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`
  );

  await fs.promises.writeFile(tempPath, buffer);
  logger.debug('S3/external image downloaded to local temp path', { tempPath });

  return {
    localPath: tempPath,
    isTemp: true,
  };
}

async function processJob(job: Job<AiAnalysisJobData>): Promise<void> {
  const { report_id, image_url, language } = job.data;
  logger.info('Processing AI analysis job', { jobId: job.id, reportId: report_id });

  // ── 1. Mark as processing ────────────────────────────────────────────────
  await updateReportStatus(report_id, 'processing');

  let resolvedImage: { localPath: string; isTemp: boolean } | null = null;
  let processedImagePath: string | null = null;

  try {
    // ── 2. Resolve image path ──────────────────────────────────────────────
    resolvedImage = await resolveLocalImagePath(image_url);

    // ── 3. Resize + strip EXIF ─────────────────────────────────────────────
    // Use 768px for the AI processing image (significantly speeds up VLM inference and prevents timeouts)
    const resized = await resizeImage(resolvedImage.localPath, { keepGps: false, maxEdge: 768 });
    processedImagePath = resized.outputPath;

    // ── 4. Vision analysis (dynamic provider selection) ───────────────────
    const analysis = config.AI_PROVIDER === 'nvidia'
      ? await analyzeBreedingSiteImageNvidia(processedImagePath, 'image/jpeg')
      : await analyzeBreedingSiteImage(processedImagePath, 'image/jpeg');

    // ── 5 + 6. Persist analysis result ────────────────────────────────────
    let finalStatus = analysis.needs_human_review ? 'needs_human_review' : 'complete';

    let updatedReport = await updateReportAnalysis({
      report_id,
      status: finalStatus,
      site_type: analysis.site_type,
      risk_level: analysis.risk_level,
      confidence_score: analysis.confidence_score,
      ai_analysis: { ...analysis, language },
      guidance_text: analysis.guidance_text,
      guidance_text_si: analysis.guidance_text_si || null,
      guidance_text_ta: analysis.guidance_text_ta || null,
      breeding_indicators: analysis.breeding_indicators,
      remediation_action: analysis.remediation_action,
    });

    logger.info('Report analysis persisted', {
      reportId: report_id,
      status: finalStatus,
      riskLevel: analysis.risk_level,
      confidence: analysis.confidence_score,
    });

    // ── 7. PostGIS Duplicate Detection & Incident Assignment ─────────────────
    let incidentId: string | null = null;

    if (updatedReport.latitude && updatedReport.longitude) {
      // Find nearby open incident within 50 meters
      const nearbyIncident = await findNearbyIncident(
        Number(updatedReport.latitude),
        Number(updatedReport.longitude),
        50
      );

      if (nearbyIncident) {
        logger.info('Found nearby open incident for duplicate check', { nearbyIncidentId: nearbyIncident.id });
        
        // Fetch matched incident primary report
        const primaryReport = await findReportById(nearbyIncident.primary_report_id);
        
        if (primaryReport) {
          // Compare using NVIDIA NIM VLM
          const comparison = await compareReportsNvidia(
            {
              site_type: primaryReport.site_type || 'other',
              description: primaryReport.notes || '',
              latitude: Number(primaryReport.latitude),
              longitude: Number(primaryReport.longitude),
              image_url: primaryReport.image_url,
            },
            {
              site_type: updatedReport.site_type || 'other',
              description: updatedReport.notes || '',
              latitude: Number(updatedReport.latitude),
              longitude: Number(updatedReport.longitude),
              image_url: updatedReport.image_url,
            }
          );

          const timeDiff = Math.abs(new Date(updatedReport.created_at).getTime() - new Date(primaryReport.created_at).getTime()) / 3600000;

          if (comparison.duplicate && comparison.confidence >= 0.90) {
            // Auto-attach
            logger.info('Auto-attaching report to matched incident', { reportId: report_id, incidentId: nearbyIncident.id });
            await updateReportIncident(report_id, nearbyIncident.id);
            incidentId = nearbyIncident.id;

            await createDecision({
              new_report_id: report_id,
              matched_incident_id: nearbyIncident.id,
              confidence: comparison.confidence,
              decision: 'auto_attached',
              status: 'approved',
              ai_reasoning: comparison.reasoning,
              gps_distance_m: Number(nearbyIncident.distance) || 0.0,
              time_diff_h: timeDiff,
              new_lat: Number(updatedReport.latitude),
              new_lng: Number(updatedReport.longitude),
            });

            await updateIncidentStats(nearbyIncident.id);
          } else if (comparison.confidence >= 0.70) {
            // Flag for review
            logger.info('Flagging report for duplicate review', { reportId: report_id, incidentId: nearbyIncident.id });
            
            // Set status to needs_human_review and attach
            finalStatus = 'needs_human_review';
            updatedReport = await updateReportAnalysis({
              report_id,
              status: finalStatus,
            });
            await updateReportIncident(report_id, nearbyIncident.id);
            incidentId = nearbyIncident.id;

            await createDecision({
              new_report_id: report_id,
              matched_incident_id: nearbyIncident.id,
              confidence: comparison.confidence,
              decision: 'flagged_review',
              status: 'pending',
              ai_reasoning: comparison.reasoning,
              gps_distance_m: Number(nearbyIncident.distance) || 0.0,
              time_diff_h: timeDiff,
              new_lat: Number(updatedReport.latitude),
              new_lng: Number(updatedReport.longitude),
            });

            await updateIncidentStats(nearbyIncident.id);
          } else {
            // High confidence that it's NOT a duplicate -> Create new incident
            logger.info('Comparison confidence low, creating new incident', { reportId: report_id });
            const code = 'INC-' + Math.floor(1000 + Math.random() * 9000);
            const newInc = await createIncident({
              code,
              status: 'open',
              risk_level: updatedReport.risk_level as any || 'medium',
              latitude: Number(updatedReport.latitude),
              longitude: Number(updatedReport.longitude),
              zone_id: updatedReport.zone_id || undefined,
              zone_name: updatedReport.location_name || undefined,
              primary_report_id: report_id,
              site_type: updatedReport.site_type as any || 'other',
            });
            await updateReportIncident(report_id, newInc.id);
            incidentId = newInc.id;

            await createDecision({
              new_report_id: report_id,
              matched_incident_id: nearbyIncident.id,
              confidence: comparison.confidence,
              decision: 'new_incident',
              status: 'approved',
              ai_reasoning: comparison.reasoning,
              gps_distance_m: Number(nearbyIncident.distance) || 0.0,
              time_diff_h: timeDiff,
              new_lat: Number(updatedReport.latitude),
              new_lng: Number(updatedReport.longitude),
            });

            await updateIncidentStats(newInc.id);
          }
        }
      } else {
        // No nearby open incidents -> Create new incident
        logger.info('No nearby incidents found, creating new incident', { reportId: report_id });
        const code = 'INC-' + Math.floor(1000 + Math.random() * 9000);
        const newInc = await createIncident({
          code,
          status: 'open',
          risk_level: updatedReport.risk_level as any || 'medium',
          latitude: Number(updatedReport.latitude),
          longitude: Number(updatedReport.longitude),
          zone_id: updatedReport.zone_id || undefined,
          zone_name: updatedReport.location_name || undefined,
          primary_report_id: report_id,
          site_type: updatedReport.site_type as any || 'other',
        });
        await updateReportIncident(report_id, newInc.id);
        incidentId = newInc.id;

        await createDecision({
          new_report_id: report_id,
          matched_incident_id: undefined,
          confidence: 1.0,
          decision: 'new_incident',
          status: 'approved',
          ai_reasoning: 'No nearby open incidents found within 50m.',
          gps_distance_m: 0.0,
          time_diff_h: 0.0,
          new_lat: Number(updatedReport.latitude),
          new_lng: Number(updatedReport.longitude),
        });

        await updateIncidentStats(newInc.id);
      }
    }


    // ── 8. Auto-create work order for high/critical reports ────────────────
    let workOrderId: string | null = null;
    const isHighRisk =
      analysis.risk_level === RISK_LEVELS.HIGH ||
      analysis.risk_level === RISK_LEVELS.CRITICAL;
    const aboveConfidenceGate = finalStatus !== 'needs_human_review';

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

    if (incidentId) {
      getIO().emit('incident:updated', { incident_id: incidentId });
    }

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
      await updateReportStatus(report_id, 'failed').catch(() => { });
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
    // Clean up the downloaded S3 temp file if we created one
    if (resolvedImage?.isTemp && resolvedImage.localPath) {
      await fs.promises.unlink(resolvedImage.localPath).catch((e) => {
        logger.warn('Failed to clean up downloaded S3 temp file', { path: resolvedImage?.localPath, error: e.message });
      });
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
      concurrency: 1,          // Process sequentially to prevent concurrent request spikes to Gemini
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
