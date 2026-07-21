import { useState } from 'react';
import { PRIMARY } from '../../theme';
import { pendingDecisions, useStore } from '../../store/useStore';
import { reportRef } from '../../utils/format';
import type { Decision } from '../../types';

export default function ReviewPanel() {
  const decisions = useStore((s) => s.decisions);
  const incidents = useStore((s) => s.incidents);
  const dupReviewOpen = useStore((s) => s.dupReviewOpen);
  const setDupReviewOpen = useStore((s) => s.setDupReviewOpen);
  const updateDecision = useStore((s) => s.updateDecision);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const pending = pendingDecisions(decisions);
  const open = dupReviewOpen == null ? pending.length > 0 : dupReviewOpen;

  const card = (d: Decision) => {
    const inc = incidents.find((x) => x.incident_id === d.matched_incident_id);
    const pct = Math.round(d.confidence * 100);
    const cc = pct >= 90 ? '#10B981' : pct >= 80 ? '#FB923C' : '#F59E0B';
    return (
      <div key={d.decision_id} style={{ border: '1px solid #eef1f0', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#94a29d', marginBottom: 4 }}>NEW REPORT {reportRef(d.new_report_no, d.new_report_id)}</div>
            <div style={{ position: 'relative', overflow: 'hidden', height: 78, borderRadius: 8, background: 'linear-gradient(135deg,#dbe7e3,#c4d6d0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#5c7a72' }}>
              📷
              {d.new_image_url && (
                <img
                  src={d.new_image_url}
                  alt="New report photo"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              )}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <span style={{ fontSize: 26, fontWeight: 700, color: cc, lineHeight: 1 }}>{pct}%</span>
            <span style={{ fontSize: 9.5, color: '#94a29d' }}>match</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#94a29d', marginBottom: 4 }}>INCIDENT {inc ? inc.code : '—'}</div>
            <div style={{ position: 'relative', overflow: 'hidden', height: 78, borderRadius: 8, background: 'linear-gradient(135deg,#cddbd6,#b3c9c2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#7c968e' }}>
              📷
              {d.inc_image_url && (
                <img
                  src={d.inc_image_url}
                  alt="Matched incident photo"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              )}
            </div>
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: '#334b45', lineHeight: 1.5, fontStyle: 'italic', background: '#f7f9f8', borderRadius: 6, padding: '7px 10px', marginBottom: 8 }}>
          "{d.ai_reasoning}"
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: 11.5, color: '#6b7c77', marginBottom: 10 }}>
          <span>📍 {d.gps_distance_m} m apart</span>
          <span>🕑 {d.time_diff_h} h between reports</span>
        </div>
        <textarea
          rows={2}
          placeholder="Override / decision reason (optional)…"
          value={reasons[d.decision_id] || ''}
          onChange={(e) => setReasons((r) => ({ ...r, [d.decision_id]: e.target.value }))}
          style={{ width: '100%', padding: '8px 10px', border: '1px solid #d5ddda', borderRadius: 8, fontSize: 12.5, fontFamily: 'Inter', resize: 'vertical', outline: 'none', marginBottom: 8 }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => updateDecision(d.decision_id, 'approve', reasons[d.decision_id])}
            style={{ flex: 1, padding: '9px', border: 'none', borderRadius: 8, background: PRIMARY, color: '#fff', cursor: 'pointer', fontFamily: 'Inter', fontSize: 12.5, fontWeight: 600 }}
          >
            Confirm match
          </button>
          <button
            onClick={() => updateDecision(d.decision_id, 'override', reasons[d.decision_id])}
            style={{ flex: 1, padding: '9px', border: '1px solid #DC2626', borderRadius: 8, background: '#fff', color: '#DC2626', cursor: 'pointer', fontFamily: 'Inter', fontSize: 12.5, fontWeight: 600 }}
          >
            Reject — create new incident
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid ' + (pending.length ? '#F3D9A6' : '#e2e8e5'), overflow: 'hidden', flexShrink: 0 }}>
      <div
        onClick={() => setDupReviewOpen(!open)}
        style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: pending.length ? '#FFFBEB' : '#fff' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ fontSize: 14 }}>🔍</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#0f2d27' }}>Duplicate reviews</span>
          {pending.length ? (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#b5730a', background: '#FDEBC8', padding: '2px 8px', borderRadius: 11 }}>
              {pending.length} pending
            </span>
          ) : (
            <span style={{ fontSize: 11, fontWeight: 600, color: '#0b6b57' }}>all reviewed</span>
          )}
        </div>
        <span style={{ fontSize: 13, color: '#94a29d', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▾</span>
      </div>
      {open && (
        <div style={{ borderTop: '1px solid #eef1f0', maxHeight: 360, overflowY: 'auto', padding: '12px 14px' }}>
          {pending.length ? pending.map(card) : <div style={{ textAlign: 'center', fontSize: 12.5, color: '#94a29d', padding: '10px' }}>No pending duplicate reviews.</div>}
        </div>
      )}
    </div>
  );
}
