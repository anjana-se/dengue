import { PRIMARY } from '../../theme';
import { PREDICTIONS, RECS } from '../../data/zones';

export default function AiRecommendations() {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8e5', overflow: 'hidden' }}>
      <div
        style={{
          padding: '13px 16px',
          borderBottom: '1px solid #eef1f0',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600 }}>AI Recommendations</span>
        <span style={{ fontSize: 11, color: '#94a29d' }}>· priority order</span>
      </div>

      {RECS.map((r) => {
        const pr = PREDICTIONS.find((p) => p.zone_id === r.zone_id);
        const cf = pr?.contributing_factors;
        const basis: [string, string][] = cf
          ? [
              ['🌧', cf.rainfall_mm_forecast + 'mm rain'],
              ['🌡', cf.temperature_avg_c + '°C'],
              ['💧', cf.humidity_percent + '% humidity'],
              ['🦟', (cf.breeding_site_density > 0.7 ? 'High' : cf.breeding_site_density > 0.45 ? 'Moderate' : 'Low') + ' breeding'],
            ]
          : [];
        return (
          <div key={r.rank} style={{ display: 'flex', gap: 12, padding: '13px 16px', borderBottom: '1px solid #f2f5f4' }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                background: PRIMARY,
                color: '#fff',
                fontWeight: 700,
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {r.rank}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{r.zone_name}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#0b6b57' }}>{r.confidence}% confidence</span>
              </div>
              <div style={{ fontSize: 13, color: '#334b45', marginTop: 2 }}>{r.action}</div>
              <div style={{ fontSize: 12, color: '#6b7c77', marginTop: 3, lineHeight: 1.45 }}>{r.reasoning}</div>
              {basis.length > 0 && (
                <div style={{ marginTop: 7 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: '#94a29d',
                      textTransform: 'uppercase',
                      letterSpacing: '.05em',
                      marginBottom: 4,
                    }}
                  >
                    Prediction basis
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 10px' }}>
                    {basis.map(([ic, lbl]) => (
                      <span
                        key={lbl}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11.5,
                          color: '#334b45',
                          background: '#f4f7f6',
                          padding: '2px 8px',
                          borderRadius: 12,
                        }}
                      >
                        <span>{ic}</span>
                        {lbl}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ fontSize: 11.5, color: '#94a29d', marginTop: 6 }}>Suggested teams: {r.suggested_teams}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
