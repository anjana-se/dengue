import { useState } from 'react';
import { INC_STATUS, PRIMARY } from '../../theme';
import { useStore } from '../../store/useStore';
import Badge from '../common/Badge';
import type { Incident } from '../../types';

function IncidentMiniCard({ inc, label }: { inc: Incident; label: string }) {
  return (
    <div style={{ flex: 1, border: '1px solid #e2e8e5', borderRadius: 10, padding: '11px 13px' }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: '#94a29d', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 5 }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 9 }}>
        <div style={{ width: 44, height: 44, borderRadius: 8, background: 'linear-gradient(135deg,#dbe7e3,#c4d6d0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, color: '#5c7a72', flexShrink: 0 }}>
          📷
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f2d27' }}>{inc.code}</div>
          <div style={{ fontSize: 11.5, color: '#6b7c77', margin: '1px 0 4px' }}>{inc.zone_name}</div>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <span style={{ padding: '1px 7px', borderRadius: 10, background: INC_STATUS[inc.status].bg, color: INC_STATUS[inc.status].c, fontSize: 10, fontWeight: 700 }}>
              {INC_STATUS[inc.status].label}
            </span>
            <Badge level={inc.risk_level} />
          </div>
          <div style={{ fontSize: 11, color: '#94a29d', marginTop: 4 }}>{inc.confirmation_count} reports</div>
        </div>
      </div>
    </div>
  );
}

export default function MergeModal() {
  const mergeSource = useStore((s) => s.mergeSource);
  const incidents = useStore((s) => s.incidents);
  const mergeQuery = useStore((s) => s.mergeQuery);
  const setMergeSource = useStore((s) => s.setMergeSource);
  const setMergeQuery = useStore((s) => s.setMergeQuery);
  const mergeIncidents = useStore((s) => s.mergeIncidents);
  const [target, setTarget] = useState<string | null>(null);

  const src = incidents.find((x) => x.incident_id === mergeSource);
  if (!src) return null;

  const q = (mergeQuery || '').toLowerCase();
  const targets = incidents.filter(
    (x) =>
      x.incident_id !== mergeSource &&
      x.status !== 'closed' &&
      (!q || x.code.toLowerCase().includes(q) || x.zone_name.toLowerCase().includes(q)),
  );
  const tgt = target ? incidents.find((x) => x.incident_id === target) : null;
  const close = () => {
    setTarget(null);
    setMergeSource(null);
  };

  return (
    <div
      onClick={close}
      style={{ position: 'fixed', inset: 0, background: 'rgba(10,30,26,.45)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 520, maxHeight: '84vh', overflowY: 'auto', background: '#fff', borderRadius: 14, padding: '22px 24px', boxShadow: '0 24px 60px rgba(0,0,0,.35)', animation: 'dg-in .25s' }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 3 }}>Merge incidents</div>
        <div style={{ fontSize: 13, color: '#6b7c77', marginBottom: 16 }}>
          Combine all reports from {src.code} into a target incident.
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <IncidentMiniCard inc={src} label="Source (will be closed)" />
          {tgt ? (
            <IncidentMiniCard inc={tgt} label="Target" />
          ) : (
            <div style={{ flex: 1, border: '1px dashed #cdd8d4', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a29d', fontSize: 12.5, padding: '11px' }}>
              Select a target below
            </div>
          )}
        </div>
        <input
          value={mergeQuery}
          onChange={(e) => setMergeQuery(e.target.value)}
          placeholder="Search by incident ID or zone name…"
          style={{ width: '100%', padding: '10px 12px', border: '1px solid #d5ddda', borderRadius: 8, fontSize: 13.5, fontFamily: 'Inter', marginBottom: 10, outline: 'none' }}
        />
        <div style={{ maxHeight: 180, overflowY: 'auto', marginBottom: 14 }}>
          {targets.map((x) => (
            <div
              key={x.incident_id}
              onClick={() => setTarget(x.incident_id)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '9px 12px',
                borderRadius: 8,
                cursor: 'pointer',
                border: '1px solid ' + (target === x.incident_id ? PRIMARY : '#eef1f0'),
                marginBottom: 6,
                background: target === x.incident_id ? '#f2f8f6' : '#fff',
              }}
            >
              <div>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{x.code}</span>
                <span style={{ fontSize: 12, color: '#94a29d', marginLeft: 8 }}>{x.zone_name}</span>
              </div>
              <span style={{ fontSize: 11, color: '#94a29d' }}>{x.confirmation_count} reports</span>
            </div>
          ))}
        </div>
        {tgt && (
          <div style={{ fontSize: 11.5, color: '#b5730a', background: '#FEF5E6', borderRadius: 8, padding: '9px 11px', marginBottom: 14 }}>
            ⚠ This action cannot be undone automatically. All reports from {src.code} will be moved to {tgt.code}.
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={close}
            style={{ padding: '10px 18px', border: '1px solid #d5ddda', borderRadius: 9, background: '#fff', cursor: 'pointer', fontFamily: 'Inter', fontSize: 13.5, fontWeight: 600, color: '#334b45' }}
          >
            Cancel
          </button>
          <button
            disabled={!tgt}
            onClick={() => {
              if (target) {
                const t = target;
                setTarget(null);
                mergeIncidents(mergeSource!, t);
              }
            }}
            style={{ padding: '10px 18px', border: 'none', borderRadius: 9, background: tgt ? PRIMARY : '#c3d3ce', color: '#fff', cursor: tgt ? 'pointer' : 'default', fontFamily: 'Inter', fontSize: 13.5, fontWeight: 600 }}
          >
            Merge
          </button>
        </div>
      </div>
    </div>
  );
}
