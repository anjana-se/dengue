import { useState } from 'react';
import { RISK } from '../../theme';
import { tago } from '../../utils/format';
import { useStore } from '../../store/useStore';
import Badge from '../common/Badge';
import ReportDrawer from './ReportDrawer';

function isPointInPolygon(pt: [number, number], poly: [number, number][]) {
  const x = pt[0], y = pt[1];
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > y) !== (yj > y))
      && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export default function Reports() {
  const reports = useStore((s) => s.reports);
  const activeReport = useStore((s) => s.activeReport);
  const setActiveReport = useStore((s) => s.setActiveReport);
  const selZone = useStore((s) => s.selZone);
  const selectZone = useStore((s) => s.selectZone);

  // Filter reports by selected boundary polygon if applicable
  const filteredReports = selZone
    ? reports.filter((r) => {
        // Fallback: match by zone ID to ensure seeded/mock reports show up
        if (r.zone_id === selZone.zone_id) return true;
        // Spatial check: check if the report falls inside the clicked boundary coordinates
        if (selZone.c && selZone.c.length > 0) {
          return isPointInPolygon([r.lat, r.lng], selZone.c as any);
        }
        return false;
      })
    : reports;

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        background: '#fff',
        borderRadius: 12,
        border: '1px solid #e2e8e5',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '13px 16px',
          borderBottom: '1px solid #eef1f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: selZone ? '#E7F7F0' : '#fff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Report Feed</span>
          {selZone && (
            <span
              onClick={() => selectZone(null)}
              style={{
                fontSize: 12,
                background: '#0b6b57',
                color: '#fff',
                padding: '2px 8px',
                borderRadius: 12,
                cursor: 'pointer',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              Zone: {selZone.meta_name || selZone.name} ✕
            </span>
          )}
        </div>
        <span style={{ fontSize: 12, color: '#94a29d', fontWeight: 600 }}>
          {filteredReports.length} reports
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filteredReports.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a29d', fontSize: 14 }}>
            No reports found for this zone.
          </div>
        ) : (
          filteredReports.map((r) => (
            <div
              key={r.report_id}
              onClick={() => setActiveReport(r)}
              style={{
                display: 'flex',
                gap: 12,
                padding: '12px 16px',
                borderBottom: '1px solid #f2f5f4',
                cursor: 'pointer',
                animation: r._new ? 'dg-in .4s' : 'none',
                background: r._new ? '#fbfdfc' : '#fff',
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 9,
                  background: 'linear-gradient(135deg,#dbe7e3,#c4d6d0)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  flexShrink: 0,
                  color: '#5c7a72',
                }}
              >
                {r.source_type === 'drone' ? '✈' : '📷'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600 }}>{r.site_type}</span>
                  <Badge level={r.risk_level} />
                </div>
                <div style={{ fontSize: 12.5, color: '#6b7c77', marginTop: 2 }}>
                  {r.zone_name} · {r.confidence}% conf.
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                  <span style={{ fontSize: 11.5, color: '#94a29d' }}>
                    {r.status === 'processing' ? '⏳ Processing…' : r.source_type === 'drone' ? 'Drone capture' : 'Community report'}
                  </span>
                  <span style={{ fontSize: 11.5, color: '#94a29d' }}>{tago(r.created_at)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {activeReport && <ReportDrawer />}
    </div>
  );
}
