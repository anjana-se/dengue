import { PRIMARY, RISK } from '../../theme';
import { datef, siteTypeLabel, reportRef, remediationLabel } from '../../utils/format';
import { useStore } from '../../store/useStore';
import Badge from '../common/Badge';
import Drawer from '../common/Drawer';

/** Detail slide-over for a single report attached to an incident. */
export default function IncReportDrawer() {
  const r = useStore((s) => s.incReport);
  const incidents = useStore((s) => s.incidents);
  const setIncReport = useStore((s) => s.setIncReport);
  const setActiveIncident = useStore((s) => s.setActiveIncident);
  const setLightbox = useStore((s) => s.setLightbox);

  if (!r) return null;
  const rk = RISK[r.risk_level];
  const inc = incidents.find((x) => x.incident_id === r.incident_id);

  const row = (k: string, v: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f2f5f4' }}>
      <span style={{ fontSize: 12.5, color: '#94a29d' }}>{k}</span>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: '#0f2d27', textAlign: 'right' }}>{v}</span>
    </div>
  );

  return (
    <Drawer title={reportRef(r.report_no, r.report_id)} onClose={() => setIncReport(null)}>
      <div
        style={{
          position: 'relative',
          height: 180,
          borderRadius: 12,
          background: 'linear-gradient(135deg,#cddbd6,#b3c9c2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 42,
          color: '#7c968e',
          marginBottom: 14,
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#0f2d27' }}>{r.role}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: r.primary ? PRIMARY : '#94a29d',
              background: r.primary ? '#E7F7F0' : '#f2f5f4',
              padding: '2px 9px',
              borderRadius: 11,
            }}
          >
            {r.primary ? 'First report' : 'Confirmation'}
          </span>
          <Badge level={r.risk_level} />
        </div>
      </div>

      {inc && (
        <div style={{ fontSize: 12.5, color: '#6b7c77', marginBottom: 14 }}>
          Part of incident{' '}
          <a
            href="javascript:void(0)"
            onClick={() => {
              setIncReport(null);
              setActiveIncident(inc.incident_id);
            }}
            style={{ color: PRIMARY, fontWeight: 600 }}
          >
            {inc.code}
          </a>{' '}
          · {r.zone_name}
        </div>
      )}

      <div style={{ background: '#f7f9f8', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#94a29d', textTransform: 'uppercase', letterSpacing: '.05em' }}>
            AI analysis
          </span>
          <span style={{ fontSize: 15, fontWeight: 700, color: PRIMARY }}>{r.confidence}%</span>
        </div>
        <div style={{ height: 6, background: '#e6ece9', borderRadius: 4, overflow: 'hidden', marginBottom: 9 }}>
          <div style={{ width: r.confidence + '%', height: '100%', background: PRIMARY }} />
        </div>
        <div style={{ fontSize: 12.5, color: '#334b45', lineHeight: 1.5 }}>
          {'Detected a ' +
            rk.label.toLowerCase() +
            '-risk ' +
            siteTypeLabel(r.site_type).toLowerCase() +
            '. ' +
            (r.larvae_visible === 'yes'
              ? 'Larvae visible in standing water — active breeding site.'
              : r.water_present
                ? 'Standing water present; monitor for larval development.'
                : 'No standing water at time of capture.')}
        </div>
      </div>

      {r.guidance_text && (
        <div
          style={{
            background: rk.bg,
            borderLeft: '3px solid ' + rk.c,
            borderRadius: 8,
            padding: '11px 13px',
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: rk.c, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>
            Field Guidance
          </div>
          <div style={{ fontSize: 12.5, color: '#334b45', lineHeight: 1.5 }}>{r.guidance_text}</div>
        </div>
      )}

      {(r.guidance_text_si || r.guidance_text_ta) && (
        <details style={{ marginBottom: 14 }}>
          <summary style={{ fontSize: 11, fontWeight: 700, color: '#94a29d', textTransform: 'uppercase', letterSpacing: '.05em', cursor: 'pointer' }}>
            Guidance translations
          </summary>
          {r.guidance_text_si && (
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: '#94a29d', marginBottom: 2 }}>සිංහල (Sinhala)</div>
              <div style={{ fontSize: 12.5, color: '#334b45', lineHeight: 1.5 }}>{r.guidance_text_si}</div>
            </div>
          )}
          {r.guidance_text_ta && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: '#94a29d', marginBottom: 2 }}>தமிழ் (Tamil)</div>
              <div style={{ fontSize: 12.5, color: '#334b45', lineHeight: 1.5 }}>{r.guidance_text_ta}</div>
            </div>
          )}
        </details>
      )}

      {r.breeding_indicators && r.breeding_indicators.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a29d', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>
            Breeding indicators
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {r.breeding_indicators.map((ind, i) => (
              <span key={i} style={{ fontSize: 11.5, background: '#eef4f2', color: '#334b45', padding: '4px 9px', borderRadius: 12 }}>
                {ind}
              </span>
            ))}
          </div>
        </div>
      )}

      {r.reasoning && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a29d', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 5 }}>
            Reasoning
          </div>
          <div style={{ fontSize: 12.5, color: '#6b7c77', lineHeight: 1.55 }}>{r.reasoning}</div>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a29d', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
          Report details
        </div>
        {row('Report ID', reportRef(r.report_no, r.report_id))}
        {row('Source', r.source_type === 'drone' ? 'Drone capture' : 'Community report')}
        {row('Site type', siteTypeLabel(r.site_type))}
        {row('Recommended action', remediationLabel(r.remediation_action))}
        {row('Larvae visible', r.larvae_visible === 'yes' ? 'Yes' : r.larvae_visible === 'no' ? 'No' : 'Unclear')}
        {row('Standing water', r.water_present ? 'Yes' : 'No')}
        {row('Dengue risk', r.is_dengue_risk ? 'Yes' : 'No')}
        {row('Needs review', r.needs_human_review ? 'Yes' : 'No')}
        {row('Submitted', datef(r.submitted_at))}
        {row('Location', r.lat.toFixed(4) + ', ' + r.lng.toFixed(4))}
      </div>

      {r.notes && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a29d', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 5 }}>
            Field notes
          </div>
          <div
            style={{
              fontSize: 12.5,
              color: '#334b45',
              lineHeight: 1.5,
              fontStyle: 'italic',
              background: '#f7f9f8',
              borderLeft: '3px solid #d5ddda',
              borderRadius: 6,
              padding: '9px 12px',
            }}
          >
            “{r.notes}”
          </div>
        </div>
      )}

      {r.additional_notes && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a29d', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 5 }}>
            Additional notes
          </div>
          <div style={{ fontSize: 12.5, color: '#6b7c77', lineHeight: 1.55 }}>{r.additional_notes}</div>
        </div>
      )}
    </Drawer>
  );
}
