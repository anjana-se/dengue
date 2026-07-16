import { PRIMARY } from '../../theme';
import { WEATHER } from '../../data/zones';
import { tago } from '../../utils/format';
import { useStore } from '../../store/useStore';

/**
 * Weather panel + 7-day report trend from dashboardSummary.
 * Weather conditions use the static climate constants for Colombo
 * (a real weather API would replace these).
 * The trend chart uses live data from the backend dashboard summary.
 */
export default function Weather() {
  const w = WEATHER;
  const dashboardSummary = useStore((s) => s.dashboardSummary);

  const mxr = Math.max(...w.forecast.map((f) => f.rain), 1);
  const metrics: [string, string, string][] = [
    ['Temperature', w.temp + '°C', '🌡'],
    ['Humidity', w.humidity + '%', '💧'],
    ['Rain (7d)', w.rain7d + 'mm', '🌧'],
  ];

  // 7-day trend from live backend data
  const trend: { day: string; total: number; critical: number; high: number }[] =
    dashboardSummary?.seven_day_trend || [];

  const maxTotal = Math.max(...trend.map((t) => t.total), 1);

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8e5', overflow: 'hidden', flexShrink: 0 }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #eef1f0', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Conditions &amp; Trends</span>
        <span style={{ fontSize: 11, color: '#94a29d' }}>updated {tago(w.updated)}</span>
      </div>

      <div style={{ padding: '13px 16px' }}>
        {/* Weather metrics */}
        <div style={{ display: 'flex', gap: 18, marginBottom: 14 }}>
          {metrics.map(([l, v, ic]) => (
            <div key={l}>
              <div style={{ fontSize: 11, color: '#94a29d' }}>{ic} {l}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#0f2d27', marginTop: 1 }}>{v}</div>
            </div>
          ))}
        </div>

        {/* 7-day rainfall forecast */}
        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a29d', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
          7-day rainfall forecast
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', marginBottom: 16 }}>
          {w.forecast.map((f) => (
            <div key={f.d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ fontSize: 10.5, color: '#334b45', fontWeight: 600 }}>{f.max}°</div>
              <div style={{ width: '100%', height: 44, background: '#eef1f0', borderRadius: 4, display: 'flex', alignItems: 'flex-end', overflow: 'hidden' }}>
                <div style={{ width: '100%', height: Math.round((f.rain / mxr) * 100) + '%', background: '#3B82F6', opacity: 0.75 }} />
              </div>
              <div style={{ fontSize: 10, color: '#94a29d' }}>{f.rain}mm</div>
              <div style={{ fontSize: 10.5, color: '#6b7c77', fontWeight: 600 }}>{f.d}</div>
            </div>
          ))}
        </div>

        {/* 7-day report trend from live backend */}
        {trend.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a29d', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
              7-day report trend (live)
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', marginBottom: 8 }}>
              {trend.map((t) => {
                const dayLabel = new Date(t.day).toLocaleDateString('en-GB', { weekday: 'short' });
                const barPct = Math.round((t.total / maxTotal) * 100);
                const critPct = t.total > 0 ? Math.round((t.critical / t.total) * 100) : 0;
                return (
                  <div key={t.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ fontSize: 10.5, color: '#334b45', fontWeight: 700 }}>{t.total}</div>
                    <div
                      title={`${t.total} total (${t.critical} critical, ${t.high} high)`}
                      style={{ width: '100%', height: 40, background: '#eef1f0', borderRadius: 4, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden' }}
                    >
                      <div style={{ width: '100%', height: barPct + '%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                        {/* Critical portion */}
                        <div style={{ width: '100%', height: critPct + '%', background: '#DC2626', opacity: 0.9 }} />
                        {/* Total remainder */}
                        <div style={{ width: '100%', flex: 1, background: PRIMARY, opacity: 0.7 }} />
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: '#6b7c77', fontWeight: 600 }}>{dayLabel}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 10.5, color: '#6b7c77' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, background: PRIMARY, borderRadius: 2, opacity: 0.8 }} />
                All reports
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, background: '#DC2626', borderRadius: 2 }} />
                Critical
              </span>
            </div>
          </>
        )}

        <div style={{ fontSize: 11, color: '#94a29d', marginTop: 11, fontStyle: 'italic' }}>
          High rainfall + humidity = elevated dengue risk
        </div>
      </div>
    </div>
  );
}
