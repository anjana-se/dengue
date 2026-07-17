import type { Decision, DecisionStatus, DecisionType, Incident, IncidentStatus } from '../types';
import { SITES, ZONES } from './zones';
import { uuid } from '../utils/uuid';

/** Reporter roles cycled through when deriving an incident's attached reports. */
export const ROLES = ['Community reporter', 'Community reporter', 'PHI officer', 'Drone operator'];

const HR = 3600e3;

export function mkIncidents(): Incident[] {
  const now = Date.now();
  const statuses: IncidentStatus[] = [
    'open', 'open', 'open', 'open', 'open', 'open',
    'verified', 'verified', 'verified', 'verified',
    'resolved', 'resolved', 'resolved',
    'closed', 'closed',
  ];
  const confs = [3, 1, 4, 2, 1, 5, 2, 1, 3, 1, 6, 2, 1, 4, 1];
  const pool: typeof ZONES = [];
  ZONES.forEach((z) => {
    const w = z.risk_level === 'critical' ? 4 : z.risk_level === 'high' ? 3 : z.risk_level === 'medium' ? 2 : 1;
    for (let k = 0; k < w; k++) pool.push(z);
  });
  const out: Incident[] = [];
  for (let i = 0; i < 15; i++) {
    const z = pool[(i * 5) % pool.length];
    const status = statuses[i];
    const created = now - (3 + i * 8) * HR;
    const verified = status !== 'open' ? created + (4 + i) * HR : null;
    const resolved = status === 'resolved' || status === 'closed' ? created + (20 + i) * HR : null;
    out.push({
      incident_id: uuid(),
      code: 'INC-' + String(1001 + i * 3).slice(-4),
      status,
      risk_level: z.risk_level,
      lat: z.c[0][0] - 0.002 - Math.random() * 0.004,
      lng: z.c[0][1] + 0.003 + Math.random() * 0.006,
      zone_id: z.zone_id,
      zone_name: z.name,
      confirmation_count: confs[i],
      report_count: confs[i],
      primary_report_id: 'R' + (1000 + i),
      created_at: new Date(created).toISOString(),
      verified_at: verified ? new Date(verified).toISOString() : null,
      resolved_at: resolved ? new Date(resolved).toISOString() : null,
      site_type: SITES[i % SITES.length],
    });
  }
  return out;
}

interface DecisionSpec {
  decision: DecisionType;
  status: DecisionStatus;
  confidence: number;
  inc: number | null;
  reason: string;
  dist: number;
  dt: number;
  by?: string;
  override?: string;
}

export function mkDecisions(incs: Incident[]): Decision[] {
  const now = Date.now();
  const spec: DecisionSpec[] = [
    { decision: 'auto_attached', status: 'approved', confidence: 0.93, inc: 0, reason: 'GPS within 12 m of an existing open incident and matching container type (discarded tyre). Image similarity 0.91.', dist: 12, dt: 2 },
    { decision: 'auto_attached', status: 'approved', confidence: 0.91, inc: 2, reason: 'Same drainage segment as the primary report, 18 m away. Water extent and debris pattern consistent.', dist: 18, dt: 5 },
    { decision: 'auto_attached', status: 'approved', confidence: 0.96, inc: 5, reason: 'Near-identical viewpoint of the same construction lot; captured 3 h after the primary report.', dist: 8, dt: 3 },
    { decision: 'flagged_review', status: 'pending', confidence: 0.78, inc: 1, reason: 'GPS 46 m from primary in the same zone, but container type differs (roof gutter vs tyre). Could be a distinct nearby site.', dist: 46, dt: 9 },
    { decision: 'flagged_review', status: 'pending', confidence: 0.83, inc: 3, reason: 'Moderate image similarity (0.74). Same street but opposite side — possibly a duplicate of the same drain.', dist: 63, dt: 14 },
    { decision: 'flagged_review', status: 'approved', confidence: 0.88, inc: 4, reason: 'High similarity, 22 m apart. Reviewer confirmed the same water storage tank.', dist: 22, dt: 6, by: 'S. Fernando (PHI)' },
    { decision: 'new_incident', status: 'approved', confidence: 0.31, inc: null, reason: 'No existing incident within 150 m. Treated as a distinct new breeding site.', dist: 210, dt: 1 },
    { decision: 'new_incident', status: 'overridden', confidence: 0.71, inc: 6, reason: 'AI attached this report to a nearby incident, but review found a separate container.', dist: 40, dt: 11, by: 'K. Perera (PHI)', override: 'Different container inspected on site, ~40 m away — logged as a separate incident.' },
  ];
  return spec.map((s, i) => {
    const inc = s.inc != null ? incs[s.inc] : null;
    const created = now - (1 + i * 2) * HR;
    return {
      decision_id: uuid(),
      new_report_id: 'R' + (2001 + i),
      matched_incident_id: inc ? inc.incident_id : null,
      confidence: s.confidence,
      decision: s.decision,
      status: s.status,
      ai_reasoning: s.reason,
      reviewed_by: s.by || (s.status === 'approved' && s.decision === 'auto_attached' ? 'System (auto)' : null),
      override_reason: s.override || null,
      created_at: new Date(created).toISOString(),
      reviewed_at: s.status !== 'pending' ? new Date(created + 30 * 60000).toISOString() : null,
      gps_distance_m: s.dist,
      time_diff_h: s.dt,
      new_lat: inc ? inc.lat + 0.0004 : 6.93,
      new_lng: inc ? inc.lng + 0.0004 : 79.86,
    };
  });
}

export const INCIDENTS = mkIncidents();
export const DECISIONS = mkDecisions(INCIDENTS);
