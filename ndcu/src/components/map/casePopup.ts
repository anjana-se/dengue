import { CASE_SEV } from '../../theme';
import { datef } from '../../utils/format';
import type { DengueCase } from '../../types';

/** HTML string for a confirmed-case Leaflet popup. */
export function casePopupHTML(c: DengueCase): string {
  const s = CASE_SEV[c.severity];
  const active = c.status === 'active';
  return `<div style="font-family:Inter">
      <div style="height:4px;background:${s.c}"></div>
      <div style="padding:11px 13px">
        <div style="font-size:10.5px;font-weight:700;color:#94a29d;text-transform:uppercase;letter-spacing:.05em">Confirmed case</div>
        <div style="font-size:14px;font-weight:700;color:#0f2d27;margin:2px 0 8px">${c.zone_name}</div>
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:7px">
          <span style="padding:2px 8px;border-radius:12px;background:${s.c}22;color:${s.c};font-size:11px;font-weight:700">${s.label}</span>
          <span style="font-size:11.5px;color:#6b7c77">Age ${c.age_group}</span>
        </div>
        <div style="font-size:12px;color:#334b45;line-height:1.55">
          <div><strong>Reported</strong> ${datef(c.reported_date)}</div>
          <div><strong>Hospital</strong> ${c.hospital}</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;margin-top:8px;font-size:11.5px;font-weight:600;color:${active ? '#DC2626' : '#10B981'}">
          <span style="width:8px;height:8px;border-radius:50%;background:${active ? '#DC2626' : '#10B981'};display:inline-block"></span>${active ? 'Active' : 'Recovered'}
        </div>
      </div></div>`;
}
