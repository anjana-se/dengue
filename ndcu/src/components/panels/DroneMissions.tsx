import { useState, useRef } from 'react';
import { RISK } from '../../theme';
import { useStore } from '../../store/useStore';
import type { MissionStatus, RiskLevel } from '../../types';
import { api } from '../../lib/api';

const MISSION_BADGE: Record<MissionStatus, [string, string, string]> = {
  open: ['#94a29d', '#f0f3f2', 'Open'],
  processing: ['#F59E0B', '#FEF5E6', 'Processing'],
  complete: ['#10B981', '#E7F7F0', 'Complete'],
};

function MissionBadge({ status }: { status: MissionStatus }) {
  const m = MISSION_BADGE[status] || MISSION_BADGE.open;
  return (
    <span style={{ padding: '3px 9px', borderRadius: 20, background: m[1], color: m[0], fontSize: 11.5, fontWeight: 700 }}>
      {m[2]}
    </span>
  );
}

export default function DroneMissions() {
  const missions = useStore((s) => s.missions);
  const zones = useStore((s) => s.zones);
  const toast = useStore((s) => s.toast);
  const fetchData = useStore((s) => s.fetchData);

  const [missionName, setMissionName] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const summaryEntries = (s: { critical: number; high: number; medium: number; low: number }): [RiskLevel, number][] => [
    ['critical', s.critical || 0],
    ['high', s.high || 0],
    ['medium', s.medium || 0],
    ['low', s.low || 0],
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (!missionName.trim()) {
      toast('Please enter a mission name', 'error');
      return;
    }
    if (selectedFiles.length === 0) {
      toast('Please select at least one image file', 'error');
      return;
    }

    setUploading(true);
    try {
      // 1. Create the drone mission
      const zoneId = selectedZoneId || zones[0]?.zone_id;
      const mission = await api.createDroneMission(missionName, zoneId);
      toast(`Mission "${mission.name}" created. Uploading frames...`, 'info');

      // 2. Upload each file in sequence
      for (const file of selectedFiles) {
        await api.uploadDroneFrame(mission.id, file);
      }

      toast('All drone frames uploaded successfully! Processing started.', 'success');
      setMissionName('');
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchData();
    } catch (err: any) {
      toast(err.message || 'Failed to upload drone mission', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, gap: 12, overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8e5', overflow: 'hidden' }}>
        <div style={{ padding: '13px 16px', borderBottom: '1px solid #eef1f0', fontSize: 15, fontWeight: 600 }}>Missions</div>
        {missions.length === 0 ? (
          <div style={{ padding: 16, fontSize: 13, color: '#94a29d', textAlign: 'center' }}>
            No drone missions found.
          </div>
        ) : (
          missions.map((m) => {
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
                            color: RISK[lv]?.c || '#94a29d',
                            background: RISK[lv]?.bg || '#f4f7f6',
                            padding: '2px 7px',
                            borderRadius: 12,
                          }}
                        >
                          {n} {RISK[lv]?.label || lv}
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
          })
        )}
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8e5', padding: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>New Mission Upload</div>
        <input
          placeholder="Mission name (e.g. Wellawatte canal survey)"
          value={missionName}
          onChange={(e) => setMissionName(e.target.value)}
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

        <select
          value={selectedZoneId}
          onChange={(e) => setSelectedZoneId(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #d5ddda',
            borderRadius: 8,
            fontSize: 14,
            fontFamily: 'Inter',
            marginBottom: 12,
            outline: 'none',
            background: '#fff',
          }}
        >
          <option value="">Select target zone...</option>
          {zones.map((z) => (
            <option key={z.zone_id} value={z.zone_id}>
              {z.name}
            </option>
          ))}
        </select>

        <input
          type="file"
          multiple
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '2px dashed #c3d3ce',
            borderRadius: 12,
            padding: '34px',
            textAlign: 'center',
            cursor: 'pointer',
            background: '#f8faf9',
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 6 }}>⬆</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#334b45' }}>
            {selectedFiles.length > 0
              ? `${selectedFiles.length} files selected`
              : 'Click to select drone images'}
          </div>
          <div style={{ fontSize: 12.5, color: '#94a29d', marginTop: 3 }}>JPEG, PNG, TIFF, DNG files</div>
        </div>

        {selectedFiles.length > 0 && (
          <div style={{ marginBottom: 12, maxHeight: 150, overflowY: 'auto' }}>
            {selectedFiles.map((f, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 12px',
                  borderRadius: 6,
                  background: '#f4f7f6',
                  marginBottom: 4,
                  fontSize: 12.5,
                }}
              >
                <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.name}
                </span>
                <span style={{ fontSize: 11, color: '#94a29d' }}>
                  {(f.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={uploading}
          style={{
            width: '100%',
            padding: '11px',
            border: 'none',
            borderRadius: 9,
            background: uploading ? '#b2c8c2' : '#0b6b57',
            color: '#fff',
            cursor: uploading ? 'default' : 'pointer',
            fontFamily: 'Inter',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          {uploading ? 'Uploading and Queueing Frames...' : 'Create Mission & Upload'}
        </button>
      </div>
    </div>
  );
}
