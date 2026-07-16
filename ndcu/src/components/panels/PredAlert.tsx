import { AMBER } from '../../theme';
import { useStore } from '../../store/useStore';

/**
 * Derives high-risk zone alerts from real zone data.
 * Zones with risk_score >= 75 or risk_level === 'critical'/'high' are warned.
 */
export default function PredAlert({ onViewPredictions }: { onViewPredictions: () => void }) {
  const dismissed = useStore((s) => s.predAlertDismissed);
  const dismissPredAlert = useStore((s) => s.dismissPredAlert);
  const enableForecastLayer = useStore((s) => s.enableForecastLayer);
  const zones = useStore((s) => s.zones);

  if (dismissed) return null;

  const criticalZones = zones.filter((z) => z.risk_level === 'critical');
  const highRiskZones = zones.filter((z) => z.risk_level === 'high' || z.risk_level === 'critical');

  if (highRiskZones.length === 0) return null;

  const names = criticalZones.length > 0
    ? criticalZones.map((z) => z.name).join(', ')
    : highRiskZones.slice(0, 3).map((z) => z.name).join(', ');

  const isCritical = criticalZones.length > 0;
  const borderColor = isCritical ? '#EF4444' : AMBER;
  const bgColor = isCritical ? '#FFF5F5' : '#FFFBEB';
  const textColor = isCritical ? '#7f1d1d' : '#7c5a10';
  const subColor = isCritical ? '#9b2c2c' : '#94824a';
  const btnBg = isCritical ? '#EF4444' : AMBER;

  return (
    <div
      style={{
        position: 'relative',
        background: bgColor,
        borderLeft: `4px solid ${borderColor}`,
        borderRadius: 10,
        padding: '12px 14px',
        animation: 'dg-in .3s',
      }}
    >
      <button
        onClick={() => dismissPredAlert()}
        style={{ position: 'absolute', top: 8, right: 10, border: 'none', background: 'none', cursor: 'pointer', fontSize: 17, color: subColor, lineHeight: 1 }}
      >
        ×
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, paddingRight: 20 }}>
        <span style={{ fontSize: 16, lineHeight: 1 }}>{isCritical ? '🚨' : '⚠️'}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: textColor }}>
          {isCritical
            ? `${criticalZones.length} zone${criticalZones.length > 1 ? 's' : ''} at CRITICAL risk`
            : `${highRiskZones.length} zone${highRiskZones.length > 1 ? 's' : ''} at high risk or above`}
        </span>
      </div>

      <div style={{ fontSize: 12, color: subColor, lineHeight: 1.4, marginBottom: 9 }}>
        {isCritical
          ? `Immediate intervention required: ${names}`
          : `Elevated risk detected: ${names}`}
        {highRiskZones.length > 3 && ` and ${highRiskZones.length - 3} more`}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => {
            enableForecastLayer();
            onViewPredictions();
          }}
          style={{
            flex: 1,
            padding: '8px',
            border: 'none',
            borderRadius: 8,
            background: btnBg,
            color: '#fff',
            cursor: 'pointer',
            fontFamily: 'Inter',
            fontSize: 12.5,
            fontWeight: 600,
          }}
        >
          View risk map
        </button>
        <button
          onClick={() => dismissPredAlert()}
          style={{
            padding: '8px 14px',
            border: `1px solid ${borderColor}`,
            borderRadius: 8,
            background: 'transparent',
            color: textColor,
            cursor: 'pointer',
            fontFamily: 'Inter',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
