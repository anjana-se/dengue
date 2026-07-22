import { useState, useRef, useMemo } from 'react';
import { RISK } from '../../theme';
import { useStore } from '../../store/useStore';
import type { MissionStatus, RiskLevel, Mission, Report } from '../../types';
import { api, getImageUrl } from '../../lib/api';
import ReportDrawer from './ReportDrawer';

const MISSION_BADGE: Record<MissionStatus, [string, string, string]> = {
  processing: ['#F59E0B', '#FEF5E6', 'In Progress'],
  complete: ['#10B981', '#E7F7F0', 'Completed'],
};

function MissionBadge({ status }: { status: MissionStatus }) {
  const m = MISSION_BADGE[status] || MISSION_BADGE.processing;
  return (
    <span style={{ padding: '4px 10px', borderRadius: 20, background: m[1], color: m[0], fontSize: 12, fontWeight: 700 }}>
      {m[2]}
    </span>
  );
}

export default function DroneMissions() {
  const missions = useStore((s) => s.missions as Mission[]);
  const zones = useStore((s) => s.zones);
  const reports = useStore((s) => s.reports);
  const toast = useStore((s) => s.toast);
  const fetchData = useStore((s) => s.fetchData);
  const setActiveReport = useStore((s) => s.setActiveReport);
  const activeReport = useStore((s) => s.activeReport);

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedMissionId, setExpandedMissionId] = useState<string | null>(null);
  const [showUploadForm, setShowUploadForm] = useState<boolean>(true);

  // Upload Form state
  const [missionName, setMissionName] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [plannedArea, setPlannedArea] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredMissions = useMemo(() => {
    return missions.filter((m) => {
      if (filterStatus === 'processing' && m.status !== 'processing') return false;
      if (filterStatus === 'complete' && m.status !== 'complete') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = m.mission_name?.toLowerCase().includes(q);
        const matchZone = m.zone_name?.toLowerCase().includes(q);
        const matchId = m.mission_id?.toLowerCase().includes(q);
        return matchName || matchZone || matchId;
      }
      return true;
    });
  }, [missions, filterStatus, searchQuery]);

  const summaryEntries = (s: { critical: number; high: number; medium: number; low: number }): [RiskLevel, number][] => [
    ['critical', s?.critical || 0],
    ['high', s?.high || 0],
    ['medium', s?.medium || 0],
    ['low', s?.low || 0],
  ];

  const getExifErrorDetail = (r: Report): { badgeText: string; detailText: string; isError: boolean } => {
    const notes = r.description || '';
    const hasGps = r.lat !== 0 && r.lng !== 0;

    if (notes.includes('[EXIF VALIDATION FAILED]')) {
      const rawError = notes.replace('[EXIF VALIDATION FAILED]', '').trim();
      if (rawError.toLowerCase().includes('located in') || rawError.toLowerCase().includes('zone')) {
        return {
          badgeText: '📍 Location Mismatch',
          detailText: rawError || 'GPS location does not match target zone',
          isError: true,
        };
      }
      if (rawError.toLowerCase().includes('no gps') || rawError.toLowerCase().includes('contains no gps')) {
        return {
          badgeText: '📷 Missing EXIF GPS',
          detailText: 'Image header contains no GPS metadata',
          isError: true,
        };
      }
      if (rawError.toLowerCase().includes('sri lanka')) {
        return {
          badgeText: '🌐 Out of Country Bounds',
          detailText: 'GPS location is outside Sri Lanka bounds',
          isError: true,
        };
      }
      return {
        badgeText: '⚠️ EXIF Failure',
        detailText: rawError,
        isError: true,
      };
    }

    if (r.needs_human_review) {
      if (!hasGps) {
        return {
          badgeText: '📷 Missing EXIF GPS',
          detailText: 'Image header contains no GPS metadata',
          isError: true,
        };
      }
      return {
        badgeText: '📍 Location Mismatch',
        detailText: `Location (${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}) flagged for verification`,
        isError: true,
      };
    }

    return { badgeText: '', detailText: '', isError: false };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!missionName.trim()) {
      toast('Please enter a mission name', 'error');
      return;
    }
    if (selectedFiles.length === 0) {
      toast('Please select at least one drone frame image', 'error');
      return;
    }

    setUploading(true);
    let exifValidCount = 0;
    let failedValidations: string[] = [];

    try {
      const zoneId = selectedZoneId || zones[0]?.zone_id;
      const mission = await api.createDroneMission(missionName, zoneId);
      toast(`Mission "${mission.name}" created. Uploading telemetry frames...`, 'info');

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setUploadProgress(`Uploading ${i + 1}/${selectedFiles.length}: ${file.name}`);
        const res = await api.uploadDroneFrame(mission.id, file);
        if (res?.exif_valid) {
          exifValidCount++;
        } else if (res?.exif_error) {
          failedValidations.push(res.exif_error);
        }
      }

      if (failedValidations.length > 0) {
        toast(`⚠️ Upload completed with EXIF validation alerts: ${failedValidations.length} image(s) failed location alignment. Flagged for review.`, 'info');
      } else {
        toast(`All drone frames uploaded successfully! All images passed EXIF location validation against target zone.`, 'success');
      }

      setMissionName('');
      setSelectedZoneId('');
      setPlannedArea('');
      setSelectedFiles([]);
      setUploadProgress('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchData();
    } catch (err: any) {
      toast(err.message || 'Failed to upload drone mission', 'error');
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  const handleStatusChange = async (missionId: string, newStatus: string) => {
    try {
      await api.updateMissionStatus(missionId, newStatus);
      toast(`Mission status updated to ${newStatus}`, 'success');
      await fetchData();
    } catch (err: any) {
      toast(err.message || 'Failed to update mission status', 'error');
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, gap: 14 }}>
      
      {/* ── TOP SECTION: New Mission Pre-Flight Upload Console ───────────────── */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8e5', padding: '10px 14px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showUploadForm ? 10 : 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0D4A3E' }}>
            Drone Images Upload
          </div>
          <button
            onClick={() => setShowUploadForm((v) => !v)}
            style={{
              padding: '3px 8px',
              borderRadius: 6,
              border: '1px solid #d5ddda',
              background: '#f4f7f6',
              color: '#334b45',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {showUploadForm ? 'Collapse ▲' : '+ New Upload ▼'}
          </button>
        </div>

        {showUploadForm && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 8 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#334b45', marginBottom: 3, display: 'block' }}>
                  Mission Name *
                </label>
                <input
                  placeholder="e.g. Wellawatte canal survey"
                  value={missionName}
                  onChange={(e) => setMissionName(e.target.value)}
                  disabled={uploading}
                  style={{
                    width: '100%',
                    padding: '6px 9px',
                    border: '1px solid #d5ddda',
                    borderRadius: 6,
                    fontSize: 12.5,
                    fontFamily: 'Inter',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#334b45', marginBottom: 3, display: 'block' }}>
                  Target Zone *
                </label>
                <select
                  value={selectedZoneId}
                  onChange={(e) => setSelectedZoneId(e.target.value)}
                  disabled={uploading}
                  style={{
                    width: '100%',
                    padding: '6px 9px',
                    border: '1px solid #d5ddda',
                    borderRadius: 6,
                    fontSize: 12.5,
                    fontFamily: 'Inter',
                    outline: 'none',
                    background: '#fff',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">Select target zone...</option>
                  {zones.map((z) => (
                    <option key={z.zone_id} value={z.zone_id}>
                      {z.name} ({z.meta_district || 'Colombo'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#334b45', marginBottom: 3, display: 'block' }}>
                  Flight Notes (Optional)
                </label>
                <input
                  placeholder="e.g. 45m grid overlay"
                  value={plannedArea}
                  onChange={(e) => setPlannedArea(e.target.value)}
                  disabled={uploading}
                  style={{
                    width: '100%',
                    padding: '6px 9px',
                    border: '1px solid #d5ddda',
                    borderRadius: 6,
                    fontSize: 12.5,
                    fontFamily: 'Inter',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <input
              type="file"
              multiple
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              disabled={uploading}
              style={{ display: 'none' }}
            />

            {/* Compact Drag & Drop Row */}
            <div style={{ display: 'flex', gap: 15, alignItems: 'center', marginBottom: selectedFiles.length > 0 ? 8 : 0 }}>
              <div
                onClick={() => !uploading && fileInputRef.current?.click()}
                style={{
                  flex: 1,
                  border: '1.5px dashed #c3d3ce',
                  borderRadius: 6,
                  padding: '7px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: uploading ? 'default' : 'pointer',
                  background: '#f8faf9',
                  fontSize: 12,
                  color: '#334b45',
                  fontWeight: 500,
                }}
              >
                <span>⬆</span>
                <span style={{ fontWeight: 600 }}>
                  {selectedFiles.length > 0
                    ? `${selectedFiles.length} image frame(s) selected`
                    : 'Click or Drag & Drop drone image frames'}
                </span>
                <span style={{ fontSize: 11, color: '#94a29d', marginLeft: 'auto' }}>
                  JPEG, PNG, TIFF, DNG, HEIC (EXIF validated)
                </span>
              </div>

              <button
                onClick={handleUpload}
                disabled={uploading}
                style={{
                  padding: '7px 16px',
                  border: 'none',
                  borderRadius: 6,
                  background: uploading ? '#b2c8c2' : '#0b6b57',
                  color: '#fff',
                  cursor: uploading ? 'default' : 'pointer',
                  fontFamily: 'Inter',
                  fontSize: 12.5,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}
              >
                {uploading ? 'Uploading...' : 'Create & Upload'}
              </button>
            </div>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div style={{ marginTop: 6, maxHeight: 90, overflowY: 'auto' }}>
                {selectedFiles.map((f, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '3px 8px',
                      borderRadius: 4,
                      background: '#f4f7f6',
                      marginBottom: 2,
                      fontSize: 11.5,
                    }}
                  >
                    <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      📷 {f.name} ({(f.size / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                    {!uploading && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(i);
                        }}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: '#EF4444',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: 12,
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {uploadProgress && (
              <div style={{ fontSize: 11.5, color: '#0b6b57', fontWeight: 600, marginTop: 6, textAlign: 'center', background: '#E7F7F0', padding: '4px', borderRadius: 6 }}>
                ⏳ {uploadProgress}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── BOTTOM SECTION: Drone Missions List & Telemetry Gallery ──────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: '#fff', borderRadius: 12, border: '1px solid #e2e8e5', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #eef1f0', display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0D4A3E' }}>
            Drone Missions & Telemetry
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <input
              placeholder="Search mission or zone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: 7,
                border: '1px solid #d5ddda',
                fontSize: 13,
                outline: 'none',
                width: 180,
              }}
            />

            {/* Filter Tabs */}
            <div style={{ display: 'flex', background: '#f4f7f6', borderRadius: 8, padding: 2 }}>
              {['all', 'processing', 'complete'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 6,
                    border: 'none',
                    background: filterStatus === st ? '#fff' : 'transparent',
                    color: filterStatus === st ? '#0D4A3E' : '#6b7c77',
                    fontWeight: filterStatus === st ? 700 : 500,
                    fontSize: 12,
                    cursor: 'pointer',
                    boxShadow: filterStatus === st ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  {st === 'processing' ? 'In Progress' : st === 'complete' ? 'Completed' : 'All'}
                </button>
              ))}
            </div>

            <button
              onClick={() => fetchData()}
              style={{
                padding: '6px 12px',
                borderRadius: 7,
                border: '1px solid #d5ddda',
                background: '#fff',
                color: '#334b45',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Scrollable Mission Items List Container */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 16 }}>

        {/* Mission Items */}
        {filteredMissions.length === 0 ? (
          <div style={{ padding: 32, fontSize: 13.5, color: '#94a29d', textAlign: 'center' }}>
            No drone missions match the selected criteria.
          </div>
        ) : (
          filteredMissions.map((m) => {
            const isExpanded = expandedMissionId === m.mission_id;
            const pct = m.image_count ? Math.round((m.processed_count / m.image_count) * 100) : 0;
            
            // Get reports belonging to this mission
            const missionReports = reports.filter(
              (r) => r.drone_mission_id === m.mission_id || (r.source_type === 'drone' && r.zone_id === m.zone_id)
            );

            return (
              <div key={m.mission_id} style={{ borderBottom: '1px solid #f2f5f4' }}>
                <div style={{ padding: '14px 16px', background: isExpanded ? '#fafcfb' : '#fff' }}>
                  
                  {/* Title & Status Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{m.mission_name}</span>
                      {m.zone_name && (
                        <span style={{ fontSize: 11.5, background: '#ECF3FE', color: '#3B82F6', fontWeight: 600, padding: '2px 8px', borderRadius: 12 }}>
                          📍 {m.zone_name}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {/* Interactive Status Selector Dropdown */}
                      {(() => {
                        const stVal = (m.status as string);
                        const isComplete = stVal === 'complete' || stVal === 'completed';

                        return (
                          <select
                            value={isComplete ? 'completed' : 'in_progress'}
                            onChange={(e) => handleStatusChange(m.mission_id, e.target.value)}
                            style={{
                              padding: '3px 10px',
                              borderRadius: 20,
                              border: '1.5px solid ' + (isComplete ? '#10B981' : '#F59E0B'),
                              fontSize: 11.5,
                              fontWeight: 700,
                              background: isComplete ? '#E7F7F0' : '#FEF5E6',
                              color: isComplete ? '#10B981' : '#D97706',
                              cursor: 'pointer',
                              outline: 'none',
                              fontFamily: 'Inter',
                            }}
                          >
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                          </select>
                        );
                      })()}

                      <button
                        onClick={() => setExpandedMissionId(isExpanded ? null : m.mission_id)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 6,
                          border: '1px solid #d5ddda',
                          background: isExpanded ? '#0D4A3E' : '#fff',
                          color: isExpanded ? '#fff' : '#334b45',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {isExpanded ? 'Hide Frames ▲' : `View Frames (${missionReports.length}) ▼`}
                      </button>
                    </div>
                  </div>

                  {/* Metadata Row & Compact Frame Processing Pill */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#6b7c77', marginBottom: 8, flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                      {m.created_at && <span>Created: {new Date(m.created_at).toLocaleString()}</span>}
                      {m.started_at && <span>Started: {new Date(m.started_at).toLocaleTimeString()}</span>}
                      {m.completed_at && <span>Completed: {new Date(m.completed_at).toLocaleTimeString()}</span>}
                      {m.planned_area && <span>Target Area: {m.planned_area}</span>}
                    </div>

                    <span style={{ fontSize: 11.5, color: '#0b6b57', fontWeight: 600, background: '#E7F7F0', padding: '2px 8px', borderRadius: 12 }}>
                      📷 {m.processed_count}/{m.image_count} frames ({pct}%)
                    </span>
                  </div>

                  {/* Risk Breakdown Badges */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {summaryEntries(m.summary).map(
                      ([lv, n]) =>
                        n > 0 && (
                          <span
                            key={lv}
                            style={{
                              fontSize: 11.5,
                              fontWeight: 700,
                              color: RISK[lv]?.c || '#94a29d',
                              background: RISK[lv]?.bg || '#f4f7f6',
                              padding: '3px 8px',
                              borderRadius: 12,
                            }}
                          >
                            {n} {RISK[lv]?.label || lv}
                          </span>
                        ),
                    )}
                  </div>

                </div>

                {/* Expanded Telemetry Frame Inspection Gallery */}
                {isExpanded && (
                  <div style={{ padding: 16, background: '#f8faf9', borderTop: '1px solid #eef1f0' }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0D4A3E', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Telemetry Image Frames ({missionReports.length} analyzed)</span>
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#6b7c77' }}>Click frame tile to inspect full report</span>
                    </div>

                    {missionReports.length === 0 ? (
                      <div style={{ padding: 16, background: '#fff', borderRadius: 8, fontSize: 13, color: '#94a29d', textAlign: 'center' }}>
                        No telemetry frames available for this mission yet.
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }}>
                        {missionReports.map((r) => {
                          const resolvedImageUrl = getImageUrl(r.image_url);
                          const exifInfo = getExifErrorDetail(r);

                          return (
                            <div
                              key={r.report_id}
                              onClick={() => setActiveReport(r)}
                              style={{
                                background: '#fff',
                                borderRadius: 10,
                                border: exifInfo.isError ? '1.5px solid #EF4444' : '1px solid #e2e8e5',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                transition: 'transform 0.15s, box-shadow 0.15s',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                              }}
                            >
                              {/* Thumbnail */}
                              <div style={{ height: 130, background: '#eef1f0', position: 'relative', overflow: 'hidden' }}>
                                {resolvedImageUrl ? (
                                  <img
                                    src={resolvedImageUrl}
                                    alt="Drone Telemetry Frame"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={(e) => {
                                      // Fallback on image load error
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#94a29d', fontSize: 12 }}>
                                    📷 Frame Photo
                                  </div>
                                )}
                                
                                {/* Risk Tag */}
                                <span
                                  style={{
                                    position: 'absolute',
                                    top: 6,
                                    right: 6,
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                    color: RISK[r.risk_level]?.c || '#fff',
                                    background: RISK[r.risk_level]?.bg || '#333',
                                    padding: '2px 7px',
                                    borderRadius: 10,
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                                  }}
                                >
                                  {RISK[r.risk_level]?.label || r.risk_level}
                                </span>

                                {/* EXIF Validation Warning Badge */}
                                {exifInfo.isError && (
                                  <span
                                    style={{
                                      position: 'absolute',
                                      top: 6,
                                      left: 6,
                                      fontSize: 10,
                                      fontWeight: 700,
                                      color: '#fff',
                                      background: '#DC2626',
                                      padding: '2px 6px',
                                      borderRadius: 4,
                                    }}
                                  >
                                    {exifInfo.badgeText}
                                  </span>
                                )}

                                {/* Larvae Badge */}
                                {r.larvae_visible === 'yes' && (
                                  <span
                                    style={{
                                      position: 'absolute',
                                      bottom: 6,
                                      left: 6,
                                      fontSize: 10,
                                      fontWeight: 700,
                                      color: '#fff',
                                      background: '#DC2626',
                                      padding: '2px 6px',
                                      borderRadius: 4,
                                    }}
                                  >
                                    🐛 Larvae Detected
                                  </span>
                                )}
                              </div>

                              {/* Card Details */}
                              <div style={{ padding: '9px 11px' }}>
                                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#111827', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                  {r.site_type || 'Potential Breeding Site'}
                                </div>
                                <div style={{ fontSize: 11, color: '#6b7c77', marginTop: 2, display: 'flex', justifyContent: 'space-between' }}>
                                  <span>Conf: {r.confidence}%</span>
                                  <span>{new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                {r.lat !== 0 && r.lng !== 0 && (
                                  <div style={{ fontSize: 10.5, color: exifInfo.isError ? '#DC2626' : '#3B82F6', marginTop: 4, fontWeight: 500 }}>
                                    GPS: {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
                                  </div>
                                )}
                                {exifInfo.isError && (
                                  <div style={{ fontSize: 10, color: '#DC2626', marginTop: 3, fontWeight: 600, lineHeight: 1.2 }}>
                                    {exifInfo.detailText}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

              </div>
            );
          })
        )}
        </div>
      </div>

      {activeReport && <ReportDrawer />}
    </div>
  );
}
