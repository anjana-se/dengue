import { PRIMARY, RISK } from '../../theme';
import { timf, siteTypeLabel, reportRef, remediationLabel } from '../../utils/format';
import { useStore } from '../../store/useStore';
import Badge from '../common/Badge';
import Drawer from '../common/Drawer';
import { api } from '../../lib/api';

export default function ReportDrawer() {
  const r = useStore((s) => s.activeReport);
  const orders = useStore((s) => s.orders);
  const setActiveReport = useStore((s) => s.setActiveReport);
  const setLightbox = useStore((s) => s.setLightbox);
  const createWO = useStore((s) => s.createWO);
  const toast = useStore((s) => s.toast);
  const fetchData = useStore((s) => s.fetchData);

  if (!r) return null;

  const rk = RISK[r.risk_level] || RISK.low;
  const hasWO = orders.some((o) => o.zone_id === r.zone_id && o.site_type === r.site_type && o.status !== 'resolved');

  const facts: [string, string][] = [
    ['Site type', siteTypeLabel(r.site_type)],
    ['Recommended action', remediationLabel(r.remediation_action)],
    ['Water present', r.ai_analysis.water_present ? 'Yes' : 'No'],
    ['Larvae visible', r.larvae_visible === 'yes' ? 'Yes ⚠' : r.larvae_visible === 'no' ? 'No' : 'Unclear'],
    ['Dengue risk', r.ai_analysis.is_dengue_risk ? 'Yes' : 'No'],
    ['Needs review', r.needs_human_review ? 'Yes ⚠' : 'No'],
    ['Source', r.source_type],
  ];

  const handleReview = async () => {
    const notes = prompt('Enter review comments/notes (optional):', 'Human review confirmed. Site requires vector control.');
    if (notes === null) return; // cancelled
    try {
      await api.reviewReport(r.report_id, notes);
      toast('Report human review submitted successfully', 'success');
      setActiveReport(null);
      await fetchData();
    } catch (err: any) {
      toast(err.message || 'Failed to review report', 'error');
    }
  };

  return (
    <Drawer title={reportRef(r.report_no, r.report_id)} onClose={() => setActiveReport(null)}>
      <div
        style={{
          position: 'relative',
          height: 190,
          borderRadius: 12,
          background: 'linear-gradient(135deg,#cddbd6,#b3c9c2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 44,
          color: '#7c968e',
          marginBottom: 16,
          overflow: 'hidden',
        }}
      >
        {/* Emoji sits underneath; a covering <img> hides it when a photo loads.
            Presigned URLs expire (~15 min) — on error we hide the img so this
            placeholder shows through again. */}
        {r.source_type === 'drone' ? '✈' : '📷'}
        {r.image_url && (
          <img
            src={r.image_url}
            alt="Report photo"
            onClick={() => setLightbox(r.image_url!)}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 18, fontWeight: 700 }}>{siteTypeLabel(r.site_type)}</span>
        <Badge level={r.risk_level} />
      </div>
      <div style={{ fontSize: 13, color: '#6b7c77', marginBottom: 16 }}>
        {r.zone_name} · {r.lat.toFixed(4)}, {r.lng.toFixed(4)} · {timf(r.created_at)}
      </div>

      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: '#94a29d',
          textTransform: 'uppercase',
          letterSpacing: '.06em',
          marginBottom: 9,
        }}
      >
        AI Analysis
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
          <span style={{ color: '#6b7c77' }}>Confidence</span>
          <span style={{ fontWeight: 700, color: PRIMARY }}>{r.confidence}%</span>
        </div>
        <div style={{ height: 7, background: '#eef1f0', borderRadius: 5, overflow: 'hidden' }}>
          <div style={{ width: r.confidence + '%', height: '100%', background: PRIMARY }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        {facts.map(([k, v]) => (
          <div key={k} style={{ background: '#f4f7f6', borderRadius: 8, padding: '8px 11px' }}>
            <div style={{ fontSize: 11, color: '#94a29d' }}>{k}</div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0f2d27', marginTop: 1 }}>{v}</div>
          </div>
        ))}
      </div>

      {r.ai_analysis.breeding_indicators && r.ai_analysis.breeding_indicators.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#94a29d',
              textTransform: 'uppercase',
              letterSpacing: '.06em',
              marginBottom: 6,
            }}
          >
            Breeding indicators
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {r.ai_analysis.breeding_indicators.map((ind, i) => (
              <span
                key={i}
                style={{ fontSize: 11.5, background: '#eef4f2', color: '#334b45', padding: '4px 9px', borderRadius: 12 }}
              >
                {ind}
              </span>
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          background: rk.bg,
          borderLeft: '3px solid ' + rk.c,
          borderRadius: 8,
          padding: '11px 13px',
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: rk.c,
            textTransform: 'uppercase',
            letterSpacing: '.04em',
            marginBottom: 4,
          }}
        >
          Field Guidance
        </div>
        <div style={{ fontSize: 13, color: '#334b45', lineHeight: 1.5 }}>{r.guidance_text}</div>
      </div>

      {(r.ai_analysis.guidance_text_si || r.ai_analysis.guidance_text_ta) && (
        <details style={{ marginBottom: 14 }}>
          <summary
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#94a29d',
              textTransform: 'uppercase',
              letterSpacing: '.06em',
              cursor: 'pointer',
              marginBottom: 6,
            }}
          >
            Guidance translations
          </summary>
          {r.ai_analysis.guidance_text_si && (
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: '#94a29d', marginBottom: 2 }}>සිංහල (Sinhala)</div>
              <div style={{ fontSize: 12.5, color: '#334b45', lineHeight: 1.5 }}>{r.ai_analysis.guidance_text_si}</div>
            </div>
          )}
          {r.ai_analysis.guidance_text_ta && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: '#94a29d', marginBottom: 2 }}>தமிழ் (Tamil)</div>
              <div style={{ fontSize: 12.5, color: '#334b45', lineHeight: 1.5 }}>{r.ai_analysis.guidance_text_ta}</div>
            </div>
          )}
        </details>
      )}

      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#94a29d',
            textTransform: 'uppercase',
            letterSpacing: '.06em',
            marginBottom: 5,
          }}
        >
          Reasoning
        </div>
        <div style={{ fontSize: 12.5, color: '#6b7c77', lineHeight: 1.55 }}>{r.ai_analysis.reasoning}</div>
      </div>

      {r.ai_analysis.additional_notes && (
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#94a29d',
              textTransform: 'uppercase',
              letterSpacing: '.06em',
              marginBottom: 5,
            }}
          >
            Additional notes
          </div>
          <div style={{ fontSize: 12.5, color: '#6b7c77', lineHeight: 1.55 }}>{r.ai_analysis.additional_notes}</div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        {hasWO ? (
          <div
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '11px',
              background: '#E7F7F0',
              color: '#0b6b57',
              borderRadius: 9,
              fontSize: 13.5,
              fontWeight: 600,
            }}
          >
            ✓ Work order exists
          </div>
        ) : (
          <button
            onClick={() => createWO(r)}
            style={{
              flex: 1,
              padding: '11px',
              border: 'none',
              borderRadius: 9,
              background: PRIMARY,
              color: '#fff',
              cursor: 'pointer',
              fontFamily: 'Inter',
              fontSize: 13.5,
              fontWeight: 600,
            }}
          >
            Create work order
          </button>
        )}
        <button
          onClick={handleReview}
          style={{
            padding: '11px 15px',
            border: '1px solid #d5ddda',
            borderRadius: 9,
            background: '#fff',
            color: '#334b45',
            cursor: 'pointer',
            fontFamily: 'Inter',
            fontSize: 13.5,
            fontWeight: 600,
          }}
        >
          Flag for review
        </button>
      </div>
    </Drawer>
  );
}
