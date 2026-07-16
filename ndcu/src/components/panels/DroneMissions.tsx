import { RISK } from '../../theme';
import { useStore } from '../../store/useStore';
import type { MissionStatus, RiskLevel } from '../../types';

const MISSION_BADGE: Record<MissionStatus, [string, string, string]> = {
  open: ['#94a29d', '#f0f3f2', 'Open'],
  processing: ['#F59E0B', '#FEF5E6', 'Processing'],
  complete: ['#10B981', '#E7F7F0', 'Complete'],
};

const UPLOAD_FILES: [string, string, boolean][] = [
  ['DJI_0421.JPG', '6.9401, 79.8562', true],
  ['DJI_0422.JPG', '6.9398, 79.8571', true],
  ['DJI_0423.DNG', 'GPS missing', false],
];

function MissionBadge({ status }: { status: MissionStatus }) {
  const m = MISSION_BADGE[status];
  return (
    <span style={{ padding: '3px 9px', borderRadius: 20, background: m[1], color: m[0], fontSize: 11.5, fontWeight: 700 }}>
      {m[2]}
    </span>
  );
}

export default function DroneMissions() {
  const missions = useStore((s) => s.missions);
  const toast = useStore((s) => s.toast);

  const summaryEntries = (s: { critical: number; high: number; medium: number; low: number }): [RiskLevel, number][] => [
    ['critical', s.critical],
    ['high', s.high],
    ['medium', s.medium],
    ['low', s.low],
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, gap: 12, overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8e5', overflow: 'hidden' }}>
        <div style={{ padding: '13px 16px', borderBottom: '1px solid #eef1f0', fontSize: 15, fontWeight: 600 }}>Missions</div>
        {missions.map((m) => {
          const pct = m.image_count ? Math.round((m.processed_count / m.image_count) * 100) : 0;
          return (
            <div key={m.mission_id} style={{ padding: '13px 16px', borderBottom: '1px solid #f2f5f4' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{m.mission_name}</span>
                <MissionBadge status={m.status} />
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                {summaryEntries(m.summary).map(
                  ([lv, n]) =>
                    n > 0 && (
                      <span
                        key={lv}
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: RISK[lv].c,
                          background: RISK[lv].bg,
                          padding: '2px 7px',
                          borderRadius: 12,
                        }}
                      >
                        {n} {RISK[lv].label}
                      </span>
                    ),
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ flex: 1, height: 6, background: '#eef1f0', borderRadius: 4, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: pct + '%',
                      height: '100%',
                      background: m.status === 'complete' ? '#10B981' : '#F59E0B',
                      transition: 'width .3s',
                    }}
                  />
                </div>
                <span style={{ fontSize: 11.5, color: '#94a29d', width: 80, textAlign: 'right' }}>
                  {m.processed_count}/{m.image_count} imgs
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8e5', padding: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>New Mission Upload</div>
        <input
          placeholder="Mission name (e.g. Wellawatte canal survey)"
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #d5ddda',
            borderRadius: 8,
            fontSize: 14,
            fontFamily: 'Inter',
            marginBottom: 12,
            outline: 'none',
          }}
        />
        <div
          onClick={() => toast('3 images queued — GPS validated', 'success')}
          style={{
            border: '2px dashed #c3d3ce',
            borderRadius: 12,
            padding: '34px',
            textAlign: 'center',
            cursor: 'pointer',
            background: '#f8faf9',
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 6 }}>⬆</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#334b45' }}>Drag &amp; drop drone images</div>
          <div style={{ fontSize: 12.5, color: '#94a29d', marginTop: 3 }}>JPEG, DNG, TIFF · up to 50 per batch</div>
        </div>
        <div style={{ marginTop: 14 }}>
          {UPLOAD_FILES.map(([f, g, ok]) => (
            <div
              key={f}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                borderRadius: 8,
                background: '#f4f7f6',
                marginBottom: 6,
                fontSize: 13,
              }}
            >
              <span style={{ fontWeight: 500 }}>{f}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: ok ? '#0b6b57' : '#c0392b' }}>
                {ok ? '✓ ' + g : '⚠ ' + g}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
