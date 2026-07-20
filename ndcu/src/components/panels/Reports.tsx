import { PRIMARY } from '../../theme';
import { siteTypeLabel } from '../../utils/format';
import { useStore } from '../../store/useStore';
import ReportDrawer from './ReportDrawer';
import ReviewPanel from './ReviewPanel';
import IncidentCard from './IncidentCard';
import IncidentDrawer from './IncidentDrawer';
import type { ReportFilter, Zone } from '../../types';

export default function Reports() {
  const activeReport = useStore((s) => s.activeReport);
  const selZone = useStore((s) => s.selZone);
  const selectZone = useStore((s) => s.selectZone);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        gap: 12,
      }}
    >
      <ReviewPanel />

      <IncidentFeed selZone={selZone} selectZone={selectZone} />

      {activeReport && <ReportDrawer />}
      {/* IncidentDrawer is rendered inside IncidentFeed below */}
    </div>
  );
}

const RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

function IncidentFeed({ selZone, selectZone }: { selZone: Zone | null; selectZone: (z: Zone | null) => void }) {
  const incidents = useStore((s) => s.incidents);
  const decisions = useStore((s) => s.decisions);
  const activeIncident = useStore((s) => s.activeIncident);
  const reportFilter = useStore((s) => s.reportFilter);
  const reportZone = useStore((s) => s.reportZone);
  const reportSev = useStore((s) => s.reportSev);
  const reportSite = useStore((s) => s.reportSite);
  const setReportFilter = useStore((s) => s.setReportFilter);
  const setReportZone = useStore((s) => s.setReportZone);
  const setReportSev = useStore((s) => s.setReportSev);
  const setReportSite = useStore((s) => s.setReportSite);

  const pendingIds = new Set(decisions.filter((d) => d.status === 'pending').map((d) => d.matched_incident_id));
  const zones = [...new Set(incidents.map((i) => i.zone_name))].sort();
  const sites = [...new Set(incidents.map((i) => i.site_type))].sort();

  let list = incidents
    .slice()
    .sort((a, b) => RANK[a.risk_level] - RANK[b.risk_level] || +new Date(b.created_at) - +new Date(a.created_at));

  if (reportFilter === 'open') list = list.filter((i) => i.status === 'open');
  else if (reportFilter === 'verified') list = list.filter((i) => i.status === 'verified');
  else if (reportFilter === 'needs_review') list = list.filter((i) => pendingIds.has(i.incident_id));

  if (reportZone !== 'all') list = list.filter((i) => i.zone_name === reportZone);
  if (reportSev !== 'all') list = list.filter((i) => i.risk_level === reportSev);
  if (reportSite !== 'all') list = list.filter((i) => i.site_type === reportSite);

  // Additional narrowing when a zone is selected from the map.
  if (selZone) list = list.filter((i) => i.zone_id === selZone.zone_id || i.zone_name === selZone.name);

  const hasSelects = reportZone !== 'all' || reportSev !== 'all' || reportSite !== 'all';

  const filt = (v: ReportFilter, lbl: string) => (
    <button
      key={v}
      onClick={() => setReportFilter(v)}
      style={{
        padding: '6px 12px',
        border: '1px solid ' + (reportFilter === v ? PRIMARY : '#dfe6e3'),
        borderRadius: 20,
        background: reportFilter === v ? PRIMARY : '#fff',
        color: reportFilter === v ? '#fff' : '#6b7c77',
        cursor: 'pointer',
        fontFamily: 'Inter',
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {lbl}
    </button>
  );

  const sel = (
    val: string,
    onChange: (v: string) => void,
    opts: { v: string; l: string }[],
    ph: string,
  ) => (
    <select
      value={val}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: '6px 9px',
        border: '1px solid ' + (val !== 'all' ? PRIMARY : '#dfe6e3'),
        borderRadius: 8,
        fontFamily: 'Inter',
        fontSize: 12,
        color: val !== 'all' ? PRIMARY : '#6b7c77',
        fontWeight: val !== 'all' ? 600 : 400,
        background: '#fff',
        cursor: 'pointer',
        maxWidth: 150,
      }}
    >
      <option value="all">{ph}</option>
      {opts.map((o) => (
        <option key={o.v} value={o.v}>
          {o.l}
        </option>
      ))}
    </select>
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: '#fff', borderRadius: 12, border: '1px solid #e2e8e5', overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #eef1f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>Incident Feed</span>
            {selZone && (
              <span onClick={() => selectZone(null)} style={{ fontSize: 12, background: '#0b6b57', color: '#fff', padding: '2px 8px', borderRadius: 12, cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                Zone: {selZone.name} ✕
              </span>
            )}
          </div>
          <span style={{ fontSize: 12, color: '#94a29d' }}>{list.length} incidents</span>
        </div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 8 }}>
          {filt('all', 'All')}
          {filt('open', 'Open')}
          {filt('verified', 'Verified')}
          {filt('needs_review', 'Needs review')}
        </div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {sel(reportZone, setReportZone, zones.map((z) => ({ v: z, l: z })), 'All zones')}
          {sel(
            reportSev,
            setReportSev,
            [
              { v: 'critical', l: 'Critical' },
              { v: 'high', l: 'High' },
              { v: 'medium', l: 'Medium' },
              { v: 'low', l: 'Low' },
            ],
            'All severities',
          )}
          {sel(reportSite, setReportSite, sites.map((s) => ({ v: s, l: siteTypeLabel(s) })), 'All site types')}
          {hasSelects && (
            <button
              onClick={() => {
                setReportZone('all');
                setReportSev('all');
                setReportSite('all');
              }}
              style={{ padding: '6px 10px', border: 'none', borderRadius: 8, background: '#f0f3f2', color: '#6b7c77', cursor: 'pointer', fontFamily: 'Inter', fontSize: 12, fontWeight: 600 }}
            >
              Clear
            </button>
          )}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {list.length ? (
          list.map((inc) => <IncidentCard key={inc.incident_id} inc={inc} />)
        ) : (
          <div style={{ padding: '28px', textAlign: 'center', fontSize: 13, color: '#94a29d' }}>No incidents match this filter.</div>
        )}
      </div>
      {activeIncident && <IncidentDrawer />}
    </div>
  );
}
