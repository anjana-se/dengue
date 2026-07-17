import { ALERT_LV, PRED_BAND, PRIMARY, TREND } from '../../theme';
import { PREDICTIONS } from '../../data/zones';
import { useStore } from '../../store/useStore';
import Drawer from '../common/Drawer';
import type { Prediction } from '../../types';

export default function PredictionsPanel() {
  const setPredPanel = useStore((s) => s.setPredPanel);
  const showPredictionOnMap = useStore((s) => s.showPredictionOnMap);

  const preds = PREDICTIONS.slice().sort((a, b) => b.outbreak_probability - a.outbreak_probability);
  const emerg = preds.filter((p) => p.outbreak_probability >= 0.75).length;

  const chip = (ic: string, l: string) => (
    <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#334b45', background: '#f4f7f6', padding: '2px 8px', borderRadius: 12 }}>
      <span>{ic}</span>
      {l}
    </span>
  );

  const card = (p: Prediction) => {
    const pct = Math.round(p.outbreak_probability * 100);
    const band = PRED_BAND(p.outbreak_probability) ?? { fill: '#94a29d', op: 0.3 };
    const al = ALERT_LV[p.alert_level];
    const tr = TREND[p.risk_trend];
    const cf = p.contributing_factors;
    const dens = cf.breeding_site_density > 0.7 ? 'High' : cf.breeding_site_density > 0.45 ? 'Moderate' : 'Low';
    return (
      <div key={p.zone_id} style={{ border: '1px solid #eef1f0', borderRadius: 11, overflow: 'hidden', marginBottom: 10 }}>
        <div style={{ height: 4, background: band.fill }} />
        <div style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: '#0f2d27' }}>{p.zone_name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 3 }}>
                <span style={{ padding: '2px 9px', borderRadius: 20, background: al.bg, color: al.c, fontSize: 11, fontWeight: 700 }}>{al.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: tr.c }}>{tr.a} {tr.label}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 30, fontWeight: 700, color: band.fill, lineHeight: 1, letterSpacing: '-.02em' }}>{pct}%</div>
              <div style={{ fontSize: 10.5, color: '#94a29d', marginTop: 1 }}>14-day risk</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 7px', marginBottom: 9 }}>
            {chip('🌧', cf.rainfall_mm_forecast + 'mm')}
            {chip('🌡', cf.temperature_avg_c + '°C')}
            {chip('💧', cf.humidity_percent + '%')}
            {chip('🦟', dens + ' breeding')}
            {chip('📋', cf.recent_case_count + ' cases/30d')}
          </div>
          <div style={{ background: al.bg, borderLeft: '3px solid ' + al.c, borderRadius: 8, padding: '8px 11px', marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: al.c, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 3 }}>
              Recommended action
            </div>
            <div style={{ fontSize: 12.5, color: '#334b45', lineHeight: 1.4 }}>{p.recommended_action}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#94a29d' }}>Confidence {Math.round(p.confidence * 100)}%</span>
            <button
              onClick={() => showPredictionOnMap(p)}
              style={{ padding: '6px 12px', border: '1px solid ' + PRIMARY, borderRadius: 7, background: '#fff', color: PRIMARY, cursor: 'pointer', fontFamily: 'Inter', fontSize: 12, fontWeight: 600 }}
            >
              Show on map →
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Drawer title="Outbreak predictions" onClose={() => setPredPanel(false)}>
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#0f2d27' }}>14-day outbreak forecast</div>
        <div style={{ fontSize: 12.5, color: '#6b7c77', marginTop: 2 }}>All {preds.length} zones ranked by outbreak probability</div>
      </div>
      <div style={{ display: 'flex', gap: 8, margin: '12px 0 16px' }}>
        <div style={{ flex: 1, background: '#FEECEC', borderRadius: 9, padding: '9px 12px' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#DC2626', lineHeight: 1 }}>{emerg}</div>
          <div style={{ fontSize: 11, color: '#94824a' }}>Warning+ zones</div>
        </div>
        <div style={{ flex: 1, background: '#f4f7f6', borderRadius: 9, padding: '9px 12px' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: PRIMARY, lineHeight: 1 }}>{preds.length}</div>
          <div style={{ fontSize: 11, color: '#6b7c77' }}>zones modelled</div>
        </div>
      </div>
      <div>{preds.map(card)}</div>
    </Drawer>
  );
}
