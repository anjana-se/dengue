import type { ReactNode } from 'react';
import { PRIMARY } from '../../theme';
import { tagoLong } from '../../utils/format';
import { useStore } from '../../store/useStore';
import type { Trap } from '../../types';

export default function IotAlertPanel() {
  const traps = useStore((s) => s.traps);
  const iotAlertOpen = useStore((s) => s.iotAlertOpen);
  const setIotAlertOpen = useStore((s) => s.setIotAlertOpen);
  const createWOFromTrap = useStore((s) => s.createWOFromTrap);

  const counts = traps.map((t) => t.readings.mosquito_count_24h).sort((a, b) => b - a);
  const q90 = counts[Math.floor(counts.length * 0.1)] ?? Infinity;
  const offline = traps.filter((t) => t.status === 'offline');
  const lowbat = traps.filter((t) => t.battery_percent < 20).sort((a, b) => a.battery_percent - b.battery_percent);
  const highact = traps
    .filter((t) => t.status === 'active' && t.readings.mosquito_count_24h >= q90)
    .sort((a, b) => b.readings.mosquito_count_24h - a.readings.mosquito_count_24h);
  const total = offline.length + lowbat.length + highact.length;
  const open = iotAlertOpen == null ? total > 0 : iotAlertOpen;

  const item = (left: string, right: string | null, rc: string | null, reason: string, t: Trap) => (
    <div key={t.trap_id + reason} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderTop: '1px solid #f2f5f4' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0f2d27' }}>{t.serial_number}</div>
        <div style={{ fontSize: 11, color: '#6b7c77', marginTop: 1 }}>{left}</div>
      </div>
      {right && <span style={{ fontSize: 11.5, fontWeight: 700, color: rc || '#6b7c77', whiteSpace: 'nowrap' }}>{right}</span>}
      <button
        onClick={() => createWOFromTrap(t, reason)}
        style={{ padding: '5px 10px', border: '1px solid ' + PRIMARY, borderRadius: 7, background: '#fff', color: PRIMARY, cursor: 'pointer', fontFamily: 'Inter', fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap' }}
      >
        Create work order
      </button>
    </div>
  );

  const group = (title: string, col: string, rows: ReactNode[]): ReactNode =>
    rows.length ? (
      <div key={title}>
        <div style={{ padding: '9px 14px 6px', fontSize: 10.5, fontWeight: 700, color: col, textTransform: 'uppercase', letterSpacing: '.05em' }}>
          {title} · {rows.length}
        </div>
        {rows}
      </div>
    ) : null;

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid ' + (total ? '#F3D9A6' : '#e2e8e5'), overflow: 'hidden', flexShrink: 0 }}>
      <div
        onClick={() => setIotAlertOpen(!open)}
        style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: total ? '#FFFBEB' : '#fff' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ fontSize: 14 }}>🛰</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#0f2d27' }}>IoT traps needing attention</span>
          {total ? (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#b5730a', background: '#FDEBC8', padding: '2px 8px', borderRadius: 11 }}>
              {total} alert{total > 1 ? 's' : ''}
            </span>
          ) : (
            <span style={{ fontSize: 11, fontWeight: 600, color: '#0b6b57' }}>all clear</span>
          )}
        </div>
        <span style={{ fontSize: 13, color: '#94a29d', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▾</span>
      </div>
      {open && (
        <div style={{ borderTop: '1px solid #eef1f0', maxHeight: 280, overflowY: 'auto' }}>
          {total ? (
            <>
              {group('Offline traps', '#888780', offline.map((t) => item(t.zone_name + ' · seen ' + tagoLong(t.last_sync_at), null, null, 'trap offline', t)))}
              {group('Low battery', '#DC2626', lowbat.map((t) => item(t.zone_name + ' · ' + t.district, t.battery_percent + '%', '#DC2626', 'low battery', t)))}
              {group(
                'High activity',
                '#F59E0B',
                highact.map((t) =>
                  item(t.zone_name + ' · top 10% activity', t.readings.mosquito_count_24h + ' /24h', '#F59E0B', 'high mosquito activity — possible breeding cluster', t),
                ),
              )}
            </>
          ) : (
            <div style={{ padding: '16px', textAlign: 'center', fontSize: 12.5, color: '#94a29d' }}>No traps currently need attention.</div>
          )}
        </div>
      )}
    </div>
  );
}
