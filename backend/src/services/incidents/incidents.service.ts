import * as incidentsQueries from '../../db/queries/incidents.queries';
import * as reportsQueries from '../../db/queries/reports.queries';
import * as zonesService from '../zones/zones.service';
import { emitIncidentUpdated } from '../notifications/notifications.service';
import { logger } from '../../shared/logger';
import { pool } from '../../db/client';

export async function listIncidents(filters: { status?: string; page?: number; limit?: number }) {
  return incidentsQueries.listIncidents(filters);
}

export async function getIncidentById(id: string) {
  return incidentsQueries.getIncidentById(id);
}

export async function getIncidentDetail(id: string) {
  const inc = await incidentsQueries.getIncidentById(id);
  if (!inc) return null;

  // Get reports associated with this incident
  const reportsRes = await pool.query(
    `SELECT id AS report_id, source_type AS role, created_at AS submitted_at, risk_level, confidence_score AS confidence,
            id = $2 AS primary
     FROM reports
     WHERE incident_id = $1
     ORDER BY created_at ASC`,
    [id, inc.primary_report_id]
  );

  // Get decisions associated with this incident
  const decisions = await incidentsQueries.getDuplicateDecisions(id);

  return {
    inc: {
      incident_id: inc.id,
      code: inc.code,
      status: inc.status,
      risk_level: inc.risk_level,
      lat: inc.latitude,
      lng: inc.longitude,
      zone_id: inc.zone_id,
      zone_name: inc.zone_name,
      confirmation_count: inc.confirmation_count,
      report_count: inc.report_count,
      primary_report_id: inc.primary_report_id,
      created_at: inc.created_at,
      verified_at: inc.verified_at,
      resolved_at: inc.resolved_at,
      site_type: inc.site_type,
    },
    reports: reportsRes.rows.map((r: any) => ({
      ...r,
      site_type: inc.site_type,
    })),
    decisions: decisions.map((d: any) => ({
      decision_id: d.id,
      new_report_id: d.new_report_id,
      matched_incident_id: d.matched_incident_id,
      confidence: d.confidence,
      decision: d.decision,
      status: d.status,
      ai_reasoning: d.ai_reasoning,
      reviewed_by: d.reviewed_by,
      override_reason: d.override_reason,
      created_at: d.created_at,
      reviewed_at: d.reviewed_at,
      gps_distance_m: d.gps_distance_m,
      time_diff_h: d.time_diff_h,
      new_lat: d.new_lat,
      new_lng: d.new_lng,
    })),
  };
}

export async function fetchDuplicateDecisions(incidentId: string) {
  return incidentsQueries.getDuplicateDecisions(incidentId);
}

export async function resolveDuplicateDecision(
  decisionId: string,
  action: 'merge' | 'separate' | 'new_incident',
  reviewedBy: string,
  overrideReason?: string,
) {
  logger.info('Resolving duplicate decision', { decisionId, action, reviewedBy });
  const decision = await incidentsQueries.getDecisionById(decisionId);
  if (!decision) throw new Error('Decision not found');

  const reportId = decision.new_report_id;
  const report = await reportsQueries.findReportById(reportId);
  if (!report) throw new Error('New report not found');

  let targetIncidentId = decision.matched_incident_id;

  if (action === 'merge') {
    if (!targetIncidentId) throw new Error('Cannot merge without a matched incident ID');
    
    // Attach report to incident
    await reportsQueries.updateReportIncident(reportId, targetIncidentId);
    
    // Update decision log
    await incidentsQueries.updateDecision(decisionId, {
      status: 'approved',
      reviewed_by: reviewedBy,
      override_reason: overrideReason,
    });

    // Update incident stats
    await incidentsQueries.updateIncidentStats(targetIncidentId);

    // Update report status back to complete since review is resolved
    await reportsQueries.updateReportStatus(reportId, 'complete');

  } else if (action === 'separate' || action === 'new_incident') {
    // Create new incident
    const code = 'INC-' + Math.floor(1000 + Math.random() * 9000);
    const newInc = await incidentsQueries.createIncident({
      code,
      status: 'open',
      risk_level: (report.risk_level as any) || 'medium',
      latitude: report.latitude || 0,
      longitude: report.longitude || 0,
      zone_id: report.zone_id || undefined,
      zone_name: report.location_name || undefined,
      primary_report_id: reportId,
      site_type: (report.site_type as any) || 'other',
    });

    // Attach report to the new incident
    await reportsQueries.updateReportIncident(reportId, newInc.id);

    // Update decision log
    await incidentsQueries.updateDecision(decisionId, {
      status: action === 'separate' ? 'overridden' : 'approved',
      reviewed_by: reviewedBy,
      override_reason: overrideReason,
    });

    // Update stats for both new and old incidents
    await incidentsQueries.updateIncidentStats(newInc.id);
    if (targetIncidentId) {
      await incidentsQueries.updateIncidentStats(targetIncidentId);
    }

    // Update report status to complete
    await reportsQueries.updateReportStatus(reportId, 'complete');
    
    targetIncidentId = newInc.id;
  }

  // Recompute risk for related zones
  if (report.zone_id) {
    await zonesService.recomputeZoneRisk(report.zone_id);
  }

  // Push WebSocket updates
  if (targetIncidentId) {
    emitIncidentUpdated({ incident_id: targetIncidentId });
  }
  if (decision.matched_incident_id) {
    emitIncidentUpdated({ incident_id: decision.matched_incident_id });
  }

  return getIncidentDetail(targetIncidentId!);
}

export async function listDecisions(filters: { status?: string }) {
  return incidentsQueries.listDecisions(filters);
}

export async function updateIncidentStatus(id: string, status: string) {
  const updated = await incidentsQueries.updateIncidentStatus(id, status);
  if (updated && updated.zone_id) {
    await zonesService.recomputeZoneRisk(updated.zone_id);
  }
  
  emitIncidentUpdated({ incident_id: id });
  
  return updated;
}



