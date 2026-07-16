import type { ReactNode } from 'react';
import { ALERT_LV, PRED_BAND, PRIMARY, TREND } from '../../theme';
import { useStore } from '../../store/useStore';

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ background: '#f4f7f6', borderRadius: 8, padding: '7px 10px' }}>
      <div style={{ fontSize: 10.5, color: '#94a29d' }}>{label}</div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0f2d27', marginTop: 1 }}>{value}</div>
    </div>
  );
}

export default function PredictionPopup() {
  const p = useStore((s) => s.selPred);
  const selectPrediction = useStore((s) => s.selectPrediction);
  const setView = useStore((s) => s.setView);
  if (!p) return null;

  const pct = Math.round(p.outbreak_probability * 100);
  const band = PRED_BAND(p.outbreak_probability) ?? { fill: '#94a29d', op: 0.3 };
  const al = ALERT_LV[p.alert_level];
  const tr = TREND[p.risk_trend];
  const cf = p.contributing_factors;
  const dens = cf.breeding_site_density > 0.7 ? 'High' : cf.breeding_site_density > 0.45 ? 'Moderate' : 'Low';

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 14,
        left: 14,
        zIndex: 500,
        width: 296,
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 6px 22px rgba(0,0,0,.22)',
        overflow: 'hidden',
        animation: 'dg-in .2s',
      }}
    >
      <div style={{ height: 4, background: band.fill }} />
      <div style={{ padding: '13px 15px', maxHeight: '56vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: '#94a29d',
                textTransform: 'uppercase',
                letterSpacing: '.05em',
              }}
            >
              14-day outbreak forecast
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f2d27', marginTop: 1 }}>{p.zone_name}</div>
          </div>
          <button
            onClick={() => selectPrediction(null)}
            style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: '#94a29d', lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '10px 0 8px' }}>
          <span style={{ fontSize: 38, fontWeight: 700, color: band.fill, lineHeight: 1, letterSpacing: '-.02em' }}>
            {pct}%
          </span>
          <div>
            <span
              style={{
                display: 'inline-block',
                padding: '3px 9px',
                borderRadius: 20,
                background: al.bg,
                color: al.c,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {al.label}
            </span>
            <div style={{ fontSize: 12, fontWeight: 600, color: tr.c, marginTop: 3 }}>
              {tr.a} {tr.label}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, margin: '10px 0' }}>
          <Fact label="Rainfall forecast" value={cf.rainfall_mm_forecast + 'mm expected'} />
          <Fact label="Temperature" value={cf.temperature_avg_c + '°C avg'} />
          <Fact label="Humidity" value={cf.humidity_percent + '%'} />
          <Fact label="Breeding density" value={dens} />
          <Fact label="Recent cases" value={cf.recent_case_count + ' in 30d'} />
          <Fact label="Confidence" value={Math.round(p.confidence * 100) + '%'} />
        </div>

        <div
          style={{
            background: al.bg,
            borderLeft: '3px solid ' + al.c,
            borderRadius: 8,
            padding: '9px 11px',
            margin: '4px 0 10px',
          }}
        >
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              color: al.c,
              textTransform: 'uppercase',
              letterSpacing: '.04em',
              marginBottom: 3,
            }}
          >
            Recommended action
          </div>
          <div style={{ fontSize: 12.5, color: '#334b45', lineHeight: 1.45 }}>{p.recommended_action}</div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
            <span style={{ color: '#94a29d' }}>Model confidence</span>
            <span style={{ fontWeight: 700, color: PRIMARY }}>{Math.round(p.confidence * 100)}%</span>
          </div>
          <div style={{ height: 6, background: '#eef1f0', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: Math.round(p.confidence * 100) + '%', height: '100%', background: PRIMARY }} />
          </div>
        </div>

        <button
          onClick={() => {
            setView('reports');
            selectPrediction(null);
          }}
          style={{
            display: 'block',
            width: '100%',
            padding: '8px',
            border: 'none',
            borderRadius: 7,
            background: PRIMARY,
            color: '#fff',
            cursor: 'pointer',
            fontFamily: 'Inter',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          View zone reports
        </button>
      </div>
    </div>
  );
}
