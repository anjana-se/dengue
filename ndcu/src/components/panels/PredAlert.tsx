import { AMBER } from '../../theme';
import { PREDICTIONS } from '../../data/zones';
import { useStore } from '../../store/useStore';

export default function PredAlert({ onViewPredictions }: { onViewPredictions: () => void }) {
  const dismissed = useStore((s) => s.predAlertDismissed);
  const dismissPredAlert = useStore((s) => s.dismissPredAlert);
  const enableForecastLayer = useStore((s) => s.enableForecastLayer);

  if (dismissed) return null;
  const warn = PREDICTIONS.filter((p) => p.outbreak_probability > 0.75).sort(
    (a, b) => b.outbreak_probability - a.outbreak_probability,
  );
  if (!warn.length) return null;
  const names = warn.map((p) => p.zone_name).join(', ');

  return (
    <div
      style={{
        position: 'relative',
        background: '#FFFBEB',
        borderLeft: '4px solid ' + AMBER,
        borderRadius: 10,
        padding: '12px 14px',
        animation: 'dg-in .3s',
      }}
    >
      <button
        onClick={() => dismissPredAlert()}
        style={{
          position: 'absolute',
          top: 8,
          right: 10,
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          fontSize: 17,
          color: '#b9a565',
          lineHeight: 1,
        }}
      >
        ×
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, paddingRight: 16 }}>
        <span style={{ fontSize: 16, lineHeight: 1 }}>⚠️</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#7c5a10' }}>
          {warn.length} zone{warn.length > 1 ? 's' : ''} at Warning level or above
        </span>
      </div>
      <div style={{ fontSize: 12, color: '#94824a', lineHeight: 1.4, marginBottom: 9 }}>
        Forecast for the next 14 days · {names}
      </div>
      <button
        onClick={() => {
          enableForecastLayer();
          onViewPredictions();
        }}
        style={{
          width: '100%',
          padding: '8px',
          border: 'none',
          borderRadius: 8,
          background: AMBER,
          color: '#fff',
          cursor: 'pointer',
          fontFamily: 'Inter',
          fontSize: 12.5,
          fontWeight: 600,
        }}
      >
        View predictions
      </button>
    </div>
  );
}
