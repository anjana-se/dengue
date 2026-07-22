import { useState } from 'react';
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
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | 'offline' | 'lowbat' | 'highact'>('all');

  const counts = traps.map((t) => t.readings.mosquito_count_24h).sort((a, b) => b - a);
  const q90 = counts[Math.floor(counts.length * 0.1)] ?? Infinity;
  const offline = traps.filter((t) => t.status === 'offline');
  const lowbat = traps.filter((t) => t.battery_percent < 20).sort((a, b) => a.battery_percent - b.battery_percent);
  const highact = traps
    .filter((t) => t.status === 'active' && t.readings.mosquito_count_24h >= q90)
    .sort((a, b) => b.readings.mosquito_count_24h - a.readings.mosquito_count_24h);
  const total = offline.length + lowbat.length + highact.length;
  const open = iotAlertOpen == null ? total > 0 : iotAlertOpen;

  const normalizedSearch = search.trim().toLowerCase();
  const matchesSearch = (t: Trap) => {
    if (!normalizedSearch) return true;
    return [t.serial_number, t.zone_name, t.district, t.status]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(normalizedSearch));
  };

  const offlineMatches = offline.filter(matchesSearch);
  const lowbatMatches = lowbat.filter(matchesSearch);
  const highactMatches = highact.filter(matchesSearch);

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

  const visibleOffline = category === 'all' || category === 'offline' ? offlineMatches : [];
  const visibleLowbat = category === 'all' || category === 'lowbat' ? lowbatMatches : [];
  const visibleHighact = category === 'all' || category === 'highact' ? highactMatches : [];
  const visibleTotal = visibleOffline.length + visibleLowbat.length + visibleHighact.length;

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
              <div style={{ padding: '12px 14px', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid #eef1f0' }}>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by serial, zone, district or status…"
                  style={{
                    flex: 1,
                    minWidth: 180,
                    height: 34,
                    padding: '0 12px',
                    borderRadius: 10,
                    border: '1px solid #d5ddda',
                    background: '#f8faf7',
                    fontSize: 13,
                    color: '#334b45',
                  }}
                />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(['all', 'offline', 'lowbat', 'highact'] as const).map((mode) => {
                    const label = mode === 'all' ? 'All' : mode === 'offline' ? 'Offline' : mode === 'lowbat' ? 'Low battery' : 'High activity';
                    return (
                      <button
                        key={mode}
                        onClick={() => setCategory(mode)}
                        style={{
                          padding: '6px 12px',
                          border: `1px solid ${category === mode ? '#0b6b57' : '#d5ddda'}`,
                          borderRadius: 20,
                          background: category === mode ? '#E7F7F0' : '#fff',
                          cursor: 'pointer',
                          fontFamily: 'Inter',
                          fontSize: 11.5,
                          fontWeight: category === mode ? 700 : 500,
                          color: category === mode ? '#0b6b57' : '#6b7c77',
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {visibleTotal ? (
                <>
                  {group('Offline traps', '#888780', visibleOffline.map((t) => item(t.zone_name + ' · seen ' + tagoLong(t.last_sync_at), null, null, 'trap offline', t)))}
                  {group('Low battery', '#DC2626', visibleLowbat.map((t) => item(t.zone_name + ' · ' + t.district, t.battery_percent + '%', '#DC2626', 'low battery', t)))}
                  {group(
                    'High activity',
                    '#F59E0B',
                    visibleHighact.map((t) =>
                      item(t.zone_name + ' · top 10% activity', t.readings.mosquito_count_24h + ' /24h', '#F59E0B', 'high mosquito activity — possible breeding cluster', t),
                    ),
                  )}
                </>
              ) : (
                <div style={{ padding: '16px', textAlign: 'center', fontSize: 12.5, color: '#94a29d' }}>
                  No traps match that search or filter.
                </div>
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
