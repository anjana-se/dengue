import { AMBER } from '../../theme';
import { useStore } from '../../store/useStore';

export default function IotStats() {
  const traps = useStore((s) => s.traps);
  const active = traps.filter((t) => t.status === 'active');
  const health = Math.round((active.length / Math.max(1, traps.length)) * 100);
  const det24 = active.reduce((a, t) => a + t.readings.mosquito_count_24h, 0);
  const byZone: Record<string, number> = {};
  traps.forEach((t) => {
    byZone[t.zone_name] = (byZone[t.zone_name] || 0) + 1;
  });
  const top = Object.entries(byZone).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const mxz = Math.max(1, ...top.map((z) => z[1]));
  const off = traps.filter((t) => t.status === 'offline').length;
  const mnt = traps.filter((t) => t.status === 'maintenance').length;
  const low = traps.filter((t) => t.battery_percent < 20).length;
  const need = off + mnt + low;
  const total7 = traps.reduce((a, t) => a + t.readings.mosquito_count_7d, 0);
  const wave = [0.82, 0.9, 0.97, 1.08, 1.16, 1.05, 0.94];
  const days = wave.map((w) => Math.round((total7 / 7) * w));
  const mx = Math.max(1, ...days);
  const W = 170;
  const H = 38;
  const pts = days.map((v, i) => [8 + i * ((W - 16) / 6), H - 4 - (v / mx) * (H - 12)] as [number, number]);
  const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');

  const metrics: [string, string, string][] = [
    ['Network health', health + '%', '#0F6E56'],
    ['Detections 24h', String(det24), '#0f2d27'],
    ['Needs attention', String(need), need ? '#F59E0B' : '#0F6E56'],
  ];

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8e5', overflow: 'hidden', flexShrink: 0 }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #eef1f0', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>IoT trap network</span>
        <span style={{ fontSize: 11, color: '#94a29d' }}>{active.length} / {traps.length} active</span>
      </div>
      <div style={{ padding: '13px 16px' }}>
        <div style={{ display: 'flex', gap: 18, marginBottom: 14 }}>
          {metrics.map(([l, v, c]) => (
            <div key={l}>
              <div style={{ fontSize: 11, color: '#94a29d' }}>{l}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: c, marginTop: 1, lineHeight: 1 }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a29d', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 7 }}>
          Top zones by trap count
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          {top.map(([z, n]) => (
            <div key={z} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ fontSize: 11.5, color: '#334b45', width: 120, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{z}</span>
              <div style={{ flex: 1, height: 8, background: '#eef1f0', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: Math.round((n / mxz) * 100) + '%', height: '100%', background: '#0F6E56' }} />
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#334b45', width: 16, textAlign: 'right' }}>{n}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: need ? '#FEF5E6' : '#E7F7F0', borderRadius: 8, padding: '8px 11px', marginBottom: 14 }}>
          <span style={{ fontSize: 13 }}>{need ? '⚠' : '✓'}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: need ? '#b5730a' : '#0b6b57' }}>
            {need ? off + ' offline · ' + mnt + ' maintenance · ' + low + ' low battery' : 'All traps healthy'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid #f2f5f4', paddingTop: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a29d', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 3 }}>
              Daily detections
            </div>
            <div style={{ fontSize: 11.5, color: '#6b7c77' }}>7-day trend across network</div>
          </div>
          <svg width={W} height={H} style={{ display: 'block' }}>
            <path d={path} fill="none" stroke="#0F6E56" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {pts.map((p, i) => (
              <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 3 : 1.6} fill={i === pts.length - 1 ? AMBER : '#0F6E56'} />
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}
