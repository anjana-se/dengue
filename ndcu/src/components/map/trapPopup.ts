import { SPECIES_LABEL, TRAP_STATUS } from '../../theme';
import { tagoLong } from '../../utils/format';
import type { Trap } from '../../types';

/** HTML string for an IoT trap Leaflet popup. The "View zone reports" link
 *  calls a global bridge installed by MapView. */
export function trapPopupHTML(t: Trap): string {
  const st = TRAP_STATUS[t.status];
  const r = t.readings;
  const avg7 = r.mosquito_count_7d / 7;
  const diff = r.mosquito_count_24h - avg7;
  const trend =
    diff > 3
      ? { a: '▲', c: '#DC2626', l: 'above 7-day avg' }
      : diff < -3
        ? { a: '▼', c: '#10B981', l: 'below 7-day avg' }
        : { a: '▬', c: '#6b7c77', l: 'near 7-day avg' };
  const batCol = t.battery_percent < 20 ? '#DC2626' : t.battery_percent < 50 ? '#F59E0B' : '#0F6E56';
  const pills = r.species_detected
    .map(
      (s) =>
        `<span style="display:inline-block;padding:2px 7px;border-radius:10px;background:#eef3f1;color:#0F6E56;font-size:10.5px;font-weight:600;margin-right:4px">${SPECIES_LABEL[s] || s}</span>`,
    )
    .join('');
  const bar = (pct: number, col: string) =>
    `<div style="height:6px;background:#eef1f0;border-radius:4px;overflow:hidden"><div style="width:${pct}%;height:100%;background:${col}"></div></div>`;
  return `<div style="font-family:Inter;width:230px">
      <div style="height:4px;background:${st.c}"></div>
      <div style="padding:11px 13px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <span style="font-size:13.5px;font-weight:700;color:#0f2d27">${t.serial_number}</span>
          <span style="padding:2px 8px;border-radius:11px;background:${st.c}22;color:${st.c};font-size:10.5px;font-weight:700">${st.label}</span>
        </div>
        <div style="font-size:11px;color:#94a29d;margin:2px 0 9px">${t.zone_name} · synced ${tagoLong(t.last_sync_at)}</div>
        <div style="display:flex;align-items:baseline;gap:7px">
          <span style="font-size:22px;font-weight:700;color:#0f2d27;line-height:1">${r.mosquito_count_24h}</span>
          <span style="font-size:11px;color:#6b7c77">mosquitoes / 24h</span>
        </div>
        <div style="font-size:11px;font-weight:600;color:${trend.c};margin:1px 0 9px">${trend.a} ${trend.l}</div>
        <div style="margin-bottom:8px">${pills}</div>
        <div style="display:flex;justify-content:space-between;font-size:11.5px;color:#334b45;margin-bottom:4px"><span>Larvae detected</span><span style="font-weight:700;color:${r.larvae_detected ? '#DC2626' : '#10B981'}">${r.larvae_detected ? 'Yes' : 'No'}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:11.5px;color:#334b45;margin-bottom:8px"><span>Water ${r.water_temp_c}°C</span><span>Humidity ${r.humidity_percent}%</span></div>
        <div style="font-size:10.5px;color:#94a29d;margin-bottom:2px">Trap fill ${r.trap_fill_percent}%</div>
        ${bar(r.trap_fill_percent, '#3B82F6')}
        <div style="font-size:10.5px;color:#94a29d;margin:7px 0 2px">Battery ${t.battery_percent}%${t.battery_percent < 20 ? ' — low' : ''}</div>
        ${bar(t.battery_percent, batCol)}
        <a href="javascript:void(0)" onclick="window.__dgViewZoneReports&&window.__dgViewZoneReports()" style="display:block;margin-top:10px;font-size:12px;font-weight:600;color:#0D4A3E">View zone reports →</a>
      </div></div>`;
}
