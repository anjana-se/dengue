import { WEATHER } from '../../data/zones';
import { tago } from '../../utils/format';

export default function Weather() {
  const w = WEATHER;
  const mxr = Math.max(...w.forecast.map((f) => f.rain));
  const metrics: [string, string, string][] = [
    ['Temperature', w.temp + '°C', '🌡'],
    ['Humidity', w.humidity + '%', '💧'],
    ['Rain (7d)', w.rain7d + 'mm', '🌧'],
  ];

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8e5', overflow: 'hidden', flexShrink: 0 }}>
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #eef1f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600 }}>Weather conditions</span>
        <span style={{ fontSize: 11, color: '#94a29d' }}>updated {tago(w.updated)}</span>
      </div>
      <div style={{ padding: '13px 16px' }}>
        <div style={{ display: 'flex', gap: 18, marginBottom: 14 }}>
          {metrics.map(([l, v, ic]) => (
            <div key={l}>
              <div style={{ fontSize: 11, color: '#94a29d' }}>
                {ic} {l}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#0f2d27', marginTop: 1 }}>{v}</div>
            </div>
          ))}
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#94a29d',
            textTransform: 'uppercase',
            letterSpacing: '.05em',
            marginBottom: 8,
          }}
        >
          7-day forecast
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
          {w.forecast.map((f) => (
            <div key={f.d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ fontSize: 10.5, color: '#334b45', fontWeight: 600 }}>{f.max}°</div>
              <div
                style={{
                  width: '100%',
                  height: 44,
                  background: '#eef1f0',
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'flex-end',
                  overflow: 'hidden',
                }}
              >
                <div style={{ width: '100%', height: Math.round((f.rain / mxr) * 100) + '%', background: '#3B82F6', opacity: 0.75 }} />
              </div>
              <div style={{ fontSize: 10, color: '#94a29d' }}>{f.rain}mm</div>
              <div style={{ fontSize: 10.5, color: '#6b7c77', fontWeight: 600 }}>{f.d}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: '#94a29d', marginTop: 11, fontStyle: 'italic' }}>
          Weather data drives outbreak predictions
        </div>
      </div>
    </div>
  );
}
