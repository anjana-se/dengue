import type { DengueCase, Report, Severity, WorkOrder } from '../types';
import { AGES, CASE_ZONES, HOSPITALS, PHIS, SITES, ZONES, type CaseZone } from './zones';

const DAY = 864e5;

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Weighted pick over case zones by their `w` weight. */
export function wpick(zs: CaseZone[]): CaseZone {
  const tot = zs.reduce((a, z) => a + z.w, 0);
  let r = Math.random() * tot;
  for (const z of zs) {
    if ((r -= z.w) <= 0) return z;
  }
  return zs[0];
}

export function mkReports(): Report[] {
  const out: Report[] = [];
  const now = Date.now();
  for (let i = 0; i < 20; i++) {
    const z = ZONES[i % ZONES.length];
    const lv = z.risk_level;
    out.push({
      report_id: 'R' + (1000 + i),
      source_type: i % 3 === 0 ? 'drone' : 'community',
      lat: z.c[0][0] - Math.random() * 0.008,
      lng: z.c[0][1] + Math.random() * 0.012,
      description: i % 3 === 0 ? 'Aerial capture — standing water detected' : 'Resident report near roadside',
      status: i < 3 ? 'processing' : 'analysed',
      risk_level: lv,
      confidence: 60 + Math.floor(Math.random() * 38),
      needs_human_review: i % 7 === 0,
      remediation_action: 'Source reduction + larvicide',
      site_type: SITES[i % SITES.length],
      larvae_visible: (lv === 'critical' || lv === 'high') ? 'yes' : 'no',
      guidance_text:
        'Empty and scrub the container. Apply larvicide to any water that cannot be removed. Advise the resident on weekly checks.',
      ai_analysis: {
        water_present: true,
        site_type: SITES[i % SITES.length],
        larvae_visible: (lv === 'critical' || lv === 'high') ? 'yes' : 'no',
        reasoning:
          'Model detected clear standing water with high surface reflectance and organic debris consistent with an active breeding site. Container geometry indicates persistent water retention.',
      },
      zone_id: z.zone_id,
      zone_name: z.name,
      created_at: new Date(now - i * 1000 * 60 * (7 + i)).toISOString(),
    });
  }
  return out;
}

export function mkOrders(): WorkOrder[] {
  const st: WorkOrder['status'][] = ['new', 'assigned', 'in_progress', 'resolved'];
  const out: WorkOrder[] = [];
  const now = Date.now();
  for (let i = 0; i < 12; i++) {
    const z = ZONES[i % ZONES.length];
    out.push({
      wo_id: 'WO' + (200 + i),
      status: st[i % 4],
      priority_score: z.risk_score - (i % 9),
      assigned_to: i % 4 === 0 ? null : PHIS[i % PHIS.length],
      lat: z.c[0][0] - 0.003,
      lng: z.c[0][1] + 0.004,
      zone_name: z.name,
      zone_id: z.zone_id,
      risk_level: z.risk_level,
      confidence: 70 + (i % 25),
      site_type: SITES[i % SITES.length],
      remediation_action: 'Source reduction',
      guidance_text:
        'Locate the flagged container. Remove standing water, treat with larvicide, and record before/after photos.',
      larvae_visible: z.risk_level === 'critical' ? 'yes' : 'no',
      image_url: null,
      description: 'Standing water flagged by AI triage at ' + z.name + '.',
      ndcu_instructions:
        i % 4 === 0 ? '' : 'Coordinate with local PHI. Photograph the follow-up state and log resident contact.',
      notes: '',
      outcome: i % 4 === 3 ? 'resolved_clean' : null,
      created_at: new Date(now - i * 1000 * 60 * 45).toISOString(),
    });
  }
  return out;
}

export function mkCases(n: number): DengueCase[] {
  const out: DengueCase[] = [];
  const now = Date.now();
  for (let i = 0; i < n; i++) {
    const z = wpick(CASE_ZONES);
    // date: spike in the last 2 weeks
    const daysAgo =
      Math.random() < 0.5 ? Math.floor(Math.random() * 14) : Math.floor(14 + Math.random() * 76);
    const sevR = Math.random();
    const severity: Severity = sevR < 0.55 ? 'mild' : sevR < 0.85 ? 'moderate' : 'severe';
    const ageR = Math.random();
    const age = ageR < 0.12 ? '0-14' : ageR < 0.52 ? '15-34' : ageR < 0.9 ? '35-59' : '60+';
    out.push({
      case_id: 'C' + (1000 + i) + '-' + Math.floor(Math.random() * 9000),
      lat: z.lat + (Math.random() - 0.5) * 0.02,
      lng: z.lng + (Math.random() - 0.5) * 0.02,
      district: z.d,
      zone_name: z.n,
      reported_date: new Date(now - daysAgo * DAY).toISOString(),
      age_group: age,
      severity,
      hospital:
        z.d === 'Gampaha'
          ? pick(['Gampaha District General Hospital', 'Ragama Teaching Hospital'])
          : pick([
              'National Hospital Colombo',
              'Colombo South Teaching Hospital',
              'Lady Ridgeway Hospital',
              'De Soysa Maternity Hospital',
            ]),
      status:
        daysAgo < 10
          ? Math.random() < 0.7
            ? 'active'
            : 'recovered'
          : Math.random() < 0.15
            ? 'active'
            : 'recovered',
    });
  }
  return out;
}

/** Re-export so consumers can build demo reports/cases without a second import. */
export { AGES, HOSPITALS, SITES, ZONES, CASE_ZONES };
