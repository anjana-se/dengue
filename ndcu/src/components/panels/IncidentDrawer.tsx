import { useState } from 'react';
import { AMBER, DEC_STATUS, DEC_TYPE, INC_STATUS, PRIMARY, RISK } from '../../theme';
import { datef, tago } from '../../utils/format';
import { useStore } from '../../store/useStore';
import Badge from '../common/Badge';
import Drawer from '../common/Drawer';
import IncReportDrawer from './IncReportDrawer';
import type { Decision, IncidentReport, IncidentStatus } from '../../types';

function ReportCard({ rp }: { rp: IncidentReport }) {
  const setIncReport = useStore((s) => s.setIncReport);
  return (
    <div
      onClick={() => setIncReport(rp)}
      style={{ display: 'flex', gap: 11, padding: '11px 13px', border: '1px solid #eef1f0', borderRadius: 10, marginBottom: 8, cursor: 'pointer' }}
    >
      <div style={{ width: 46, height: 46, borderRadius: 8, background: 'linear-gradient(135deg,#dbe7e3,#c4d6d0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, color: '#5c7a72' }}>
        {rp.role === 'Drone operator' ? '✈' : '📷'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#0f2d27' }}>{rp.role}</span>
          <Badge level={rp.risk_level} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: rp.primary ? PRIMARY : '#94a29d', background: rp.primary ? '#E7F7F0' : '#f2f5f4', padding: '1px 7px', borderRadius: 10 }}>
            {rp.primary ? 'First report' : 'Confirmation ' + rp.report_id.split('-C')[1]}
          </span>
          <span style={{ fontSize: 11, color: '#94a29d' }}>{rp.confidence}% · {tago(rp.submitted_at)}</span>
        </div>
        <div style={{ fontSize: 10.5, color: '#b3beb9', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
          View report details <span>→</span>
        </div>
      </div>
    </div>
  );
}

function DecisionRow({ d }: { d: Decision }) {
  const overrideDec = useStore((s) => s.overrideDec);
  const setOverrideDec = useStore((s) => s.setOverrideDec);
  const updateDecision = useStore((s) => s.updateDecision);
  const [reason, setReason] = useState('');
  const t = DEC_TYPE[d.decision];
  const ds = DEC_STATUS[d.status];
  const pct = Math.round(d.confidence * 100);
  const cc = pct >= 90 ? '#10B981' : pct >= 80 ? '#FB923C' : '#F59E0B';
  const editing = overrideDec === d.decision_id;

  return (
    <div style={{ border: '1px solid #eef1f0', borderRadius: 10, padding: '11px 13px', marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ padding: '2px 8px', borderRadius: 11, background: t.bg, color: t.c, fontSize: 10.5, fontWeight: 700 }}>{t.label}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: ds.c }}>{ds.label}</span>
        </div>
        <span style={{ fontSize: 15, fontWeight: 700, color: cc }}>{pct}%</span>
      </div>
      <div style={{ fontSize: 11.5, color: '#334b45', lineHeight: 1.5, fontStyle: 'italic', background: '#f7f9f8', borderLeft: '3px solid #d5ddda', borderRadius: 6, padding: '7px 10px' }}>
        "{d.ai_reasoning}"
      </div>
      {d.override_reason && (
        <div style={{ fontSize: 11.5, color: '#7c5aa0', marginTop: 6 }}>
          <strong>Override: </strong>
          {d.override_reason + (d.reviewed_by ? ' — ' + d.reviewed_by : '')}
        </div>
      )}
      {d.status === 'pending' && d.decision === 'flagged_review' ? (
        editing ? (
          <div style={{ marginTop: 8 }}>
            <textarea
              rows={2}
              placeholder="Reason for override…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #d5ddda', borderRadius: 8, fontSize: 12.5, fontFamily: 'Inter', resize: 'vertical', outline: 'none', marginBottom: 7 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => updateDecision(d.decision_id, 'approve', reason)}
                style={{ flex: 1, padding: '7px', border: 'none', borderRadius: 7, background: PRIMARY, color: '#fff', cursor: 'pointer', fontFamily: 'Inter', fontSize: 12, fontWeight: 600 }}
              >
                Attach to incident
              </button>
              <button
                onClick={() => updateDecision(d.decision_id, 'override', reason)}
                style={{ flex: 1, padding: '7px', border: '1px solid #DC2626', borderRadius: 7, background: '#fff', color: '#DC2626', cursor: 'pointer', fontFamily: 'Inter', fontSize: 12, fontWeight: 600 }}
              >
                Reject — new incident
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setOverrideDec(d.decision_id)}
            style={{ marginTop: 8, padding: '6px 12px', border: '1px solid ' + AMBER, borderRadius: 7, background: '#fff', color: '#b5730a', cursor: 'pointer', fontFamily: 'Inter', fontSize: 12, fontWeight: 600 }}
          >
            Override
          </button>
        )
      ) : null}
    </div>
  );
}

export default function IncidentDrawer() {
  const activeIncident = useStore((s) => s.activeIncident);
  const getIncident = useStore((s) => s.getIncident);
  const role = useStore((s) => s.role);
  const orders = useStore((s) => s.orders);
  const setActiveIncident = useStore((s) => s.setActiveIncident);
  const setMergeSource = useStore((s) => s.setMergeSource);
  const setIncidentStatus = useStore((s) => s.setIncidentStatus);
  const createWOFromIncident = useStore((s) => s.createWOFromIncident);
  const toast = useStore((s) => s.toast);
  const incReport = useStore((s) => s.incReport);

  // subscribe to incidents/decisions so the drawer re-derives on change
  useStore((s) => s.incidents);
  useStore((s) => s.decisions);

  const data = getIncident(activeIncident);
  if (!data) return null;
  const { inc } = data;
  const st = INC_STATUS[inc.status];
  const admin = role === 'ndcu_admin';
  const hasWO = orders.some((o) => o.incident_id === inc.incident_id);

  const meta = (k: string, v: string | null) => (
    <div style={{ background: '#f4f7f6', borderRadius: 8, padding: '8px 11px' }}>
      <div style={{ fontSize: 11, color: '#94a29d' }}>{k}</div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0f2d27', marginTop: 1 }}>{v || '—'}</div>
    </div>
  );

  const trans: [IncidentStatus, string][] = [];
  if (inc.status === 'open') trans.push(['verified', 'Mark verified']);
  if (inc.status === 'open' || inc.status === 'verified') trans.push(['resolved', 'Mark resolved']);
  if (inc.status !== 'closed') trans.push(['closed', 'Close']);

  return (
    <>
    <Drawer title="Incident" onClose={() => setActiveIncident(null)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 18, fontWeight: 700 }}>{inc.code}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{ padding: '3px 9px', borderRadius: 20, background: st.bg, color: st.c, fontSize: 11.5, fontWeight: 700 }}>{st.label}</span>
          <Badge level={inc.risk_level} />
        </div>
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: PRIMARY, marginBottom: 12 }}>
        {inc.confirmation_count + (inc.confirmation_count > 1 ? ' reports confirm' : ' report confirms') + ' this site · ' + inc.zone_name}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 18 }}>
        {meta('Created', datef(inc.created_at))}
        {meta('Verified', inc.verified_at ? datef(inc.verified_at) : null)}
        {meta('Resolved', inc.resolved_at ? datef(inc.resolved_at) : null)}
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a29d', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 9 }}>
        Reports attached ({data.reports.length})
      </div>
      <div style={{ marginBottom: 18 }}>
        {data.reports.map((rp) => (
          <ReportCard key={rp.report_id} rp={rp} />
        ))}
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a29d', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 9 }}>
        AI duplicate decisions ({data.decisions.length})
      </div>
      {data.decisions.length ? (
        <div style={{ marginBottom: 18 }}>
          {data.decisions.map((d) => (
            <DecisionRow key={d.decision_id} d={d} />
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12.5, color: '#94a29d', marginBottom: 18 }}>No duplicate decisions recorded for this incident.</div>
      )}

      {hasWO ? (
        <div style={{ textAlign: 'center', padding: '11px', background: '#E7F7F0', color: '#0b6b57', borderRadius: 9, fontSize: 13.5, fontWeight: 600, marginBottom: 18 }}>
          ✓ Work order exists for this incident
        </div>
      ) : (
        <button
          onClick={() => createWOFromIncident(inc)}
          style={{ display: 'block', width: '100%', padding: '11px', border: 'none', borderRadius: 9, background: PRIMARY, color: '#fff', cursor: 'pointer', fontFamily: 'Inter', fontSize: 13.5, fontWeight: 600, marginBottom: 18 }}
        >
          Create work order
        </button>
      )}

      {admin && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a29d', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 9 }}>
            Admin actions
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <button
              onClick={() => setMergeSource(inc.incident_id)}
              style={{ flex: 1, padding: '9px', border: '1px solid #d5ddda', borderRadius: 8, background: '#fff', color: '#334b45', cursor: 'pointer', fontFamily: 'Inter', fontSize: 12.5, fontWeight: 600 }}
            >
              Merge with another
            </button>
            <button
              onClick={() => toast('Split incident — select reports to detach', 'info')}
              style={{ flex: 1, padding: '9px', border: '1px solid #d5ddda', borderRadius: 8, background: '#fff', color: '#334b45', cursor: 'pointer', fontFamily: 'Inter', fontSize: 12.5, fontWeight: 600 }}
            >
              Split incident
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {trans.map(([s, lbl]) => (
              <button
                key={s}
                onClick={() => setIncidentStatus(inc.incident_id, s)}
                style={{ flex: 1, minWidth: 110, padding: '9px', border: 'none', borderRadius: 8, background: s === 'closed' ? '#6b7c77' : INC_STATUS[s].c, color: '#fff', cursor: 'pointer', fontFamily: 'Inter', fontSize: 12.5, fontWeight: 600 }}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>
      )}
    </Drawer>
    {incReport && <IncReportDrawer />}
    </>
  );
}
