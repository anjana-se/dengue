import { CASE_SEV, PRIMARY, AMBER } from '../../theme';
import { AGES } from '../../data/zones';
import { filteredCases } from '../../utils/cases';
import { useStore } from '../../store/useStore';
import type { Severity } from '../../types';

const DAY = 864e5;
const SEVERITIES: Severity[] = ['mild', 'moderate', 'severe'];

export default function CaseStats() {
  const allCases = useStore((s) => s.cases);
  const dateFrom = useStore((s) => s.dateFrom);
  const dateTo = useStore((s) => s.dateTo);
  const setCaseView = useStore((s) => s.setCaseView);
  const caseView = useStore((s) => s.caseView);

  const cases = filteredCases(allCases, dateFrom, dateTo);
  const bySev: Record<Severity, number> = { mild: 0, moderate: 0, severe: 0 };
  const byAge: Record<string, number> = { '0-14': 0, '15-34': 0, '35-59': 0, '60+': 0 };
  const byZone: Record<string, number> = {};

  cases.forEach((c) => {
    bySev[c.severity]++;
    byAge[c.age_group]++;
    byZone[c.zone_name] = (byZone[c.zone_name] || 0) + 1;
  });

  const total = cases.length || 1;
  const topZone: [string, number] = Object.entries(byZone).sort((a, b) => b[1] - a[1])[0] || ['—', 0];

  // 7-day sparkline over ALL cases
  const now = Date.now();
  const days: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d0 = now - i * DAY;
    days.push(
      allCases.filter((c) => {
        const t = new Date(c.reported_date).getTime();
        return t >= d0 - DAY && t < d0;
      }).length,
    );
  }
  const mx = Math.max(1, ...days);
  const W = 150;
  const H = 34;
  const pts = days.map((v, i) => [8 + i * ((W - 16) / 6), H - 4 - (v / mx) * (H - 10)] as [number, number]);
  const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');

  const active = cases.filter((c) => c.status === 'active').length;
  const recovered = cases.filter((c) => c.status === 'recovered').length;

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8e5', overflow: 'hidden', flexShrink: 0 }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #eef1f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Case statistics</span>
        <div style={{ display: 'flex', gap: 4, background: '#f0f3f2', padding: 3, borderRadius: 7 }}>
          {(['cluster', 'heatmap'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setCaseView(v)}
              style={{
                padding: '4px 10px',
                border: 'none',
                borderRadius: 5,
                cursor: 'pointer',
                fontFamily: 'Inter',
                fontSize: 11,
                fontWeight: 600,
                background: caseView === v ? '#fff' : 'transparent',
                color: caseView === v ? PRIMARY : '#94a29d',
                boxShadow: caseView === v ? '0 1px 2px rgba(0,0,0,.1)' : 'none',
              }}
            >
              {v === 'cluster' ? 'Clusters' : 'Heatmap'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '13px 16px' }}>
        {/* Total count */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 30, fontWeight: 700, color: PRIMARY, lineHeight: 1, letterSpacing: '-.02em' }}>
            {cases.length}
          </span>
          <span style={{ fontSize: 12.5, color: '#6b7c77' }}>confirmed cases in range</span>
        </div>

        {/* Active / recovered pills */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <span style={{ padding: '2px 10px', borderRadius: 20, background: '#fef2f2', color: '#c0392b', fontSize: 11.5, fontWeight: 700 }}>
            {active} active
          </span>
          <span style={{ padding: '2px 10px', borderRadius: 20, background: '#E7F7F0', color: '#0b6b57', fontSize: 11.5, fontWeight: 700 }}>
            {recovered} recovered
          </span>
        </div>

        {/* Severity bar */}
        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a29d', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 5 }}>
          By severity
        </div>
        <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', marginBottom: 6, gap: 2 }}>
          {SEVERITIES.map((k) => (
            <div
              key={k}
              title={CASE_SEV[k].label + ' ' + bySev[k]}
              style={{ flex: bySev[k] || 0.02, background: CASE_SEV[k].c, height: '100%' }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
          {SEVERITIES.map((k) => (
            <span key={k} style={{ fontSize: 11.5, color: '#6b7c77', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: CASE_SEV[k].c }} />
              {CASE_SEV[k].label + ' ' + bySev[k]}
            </span>
          ))}
        </div>

        {/* Age group bars */}
        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a29d', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>
          By age group
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
          {AGES.map((a) => (
            <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11.5, color: '#6b7c77', width: 42 }}>{a}</span>
              <div style={{ flex: 1, height: 8, background: '#eef1f0', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: Math.round((byAge[a] / total) * 100) + '%', height: '100%', background: PRIMARY }} />
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: '#334b45', width: 20, textAlign: 'right' }}>{byAge[a]}</span>
            </div>
          ))}
        </div>

        {/* Bottom: top zone + sparkline */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid #f2f5f4', paddingTop: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a29d', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 3 }}>
              Most affected
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0f2d27' }}>{topZone[0]}</div>
            <div style={{ fontSize: 11.5, color: '#6b7c77' }}>{topZone[1]} cases</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a29d', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 3 }}>
              7-day trend
            </div>
            <svg width={W} height={H} style={{ display: 'block' }}>
              <path d={path} fill="none" stroke={PRIMARY} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {pts.map((p, i) => (
                <circle
                  key={i}
                  cx={p[0]}
                  cy={p[1]}
                  r={i === pts.length - 1 ? 3 : 1.6}
                  fill={i === pts.length - 1 ? AMBER : PRIMARY}
                />
              ))}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
