import type { ReactNode } from 'react';
import { PRIMARY } from '../../theme';
import { useStore } from '../../store/useStore';
import { filteredCases } from '../../utils/cases';
import type { CaseView, LayerKey, TrapView } from '../../types';

const DAY = 864e5;

function Hdr({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: '#94a29d',
        textTransform: 'uppercase',
        letterSpacing: '.06em',
        margin: '9px 0 5px',
      }}
    >
      {children}
    </div>
  );
}

export default function LayerToggle() {
  const layers = useStore((s) => s.layers);
  const toggleLayer = useStore((s) => s.toggleLayer);
  const caseView = useStore((s) => s.caseView);
  const setCaseView = useStore((s) => s.setCaseView);
  const trapView = useStore((s) => s.trapView);
  const setTrapView = useStore((s) => s.setTrapView);
  const dateFrom = useStore((s) => s.dateFrom);
  const dateTo = useStore((s) => s.dateTo);
  const setDateRange = useStore((s) => s.setDateRange);
  const cases = useStore((s) => s.cases);

  const row = (k: LayerKey, lbl: string, col?: string) => (
    <label
      key={k}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 12.5,
        fontWeight: 500,
        color: '#0f2d27',
        cursor: 'pointer',
        padding: '3px 0',
      }}
    >
      <input
        type="checkbox"
        checked={!!layers[k]}
        onChange={() => toggleLayer(k)}
        style={{ accentColor: PRIMARY, width: 14, height: 14 }}
      />
      {col && (
        <span
          style={{ width: 11, height: 11, borderRadius: 3, background: col, display: 'inline-block', flexShrink: 0 }}
        />
      )}
      {lbl}
    </label>
  );

  const now = Date.now();
  const fromLbl = new Date(now - dateFrom * DAY).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  const toLbl = new Date(now - dateTo * DAY).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const seg = (v: CaseView, lbl: string) => (
    <button
      key={v}
      onClick={() => setCaseView(v)}
      style={{
        flex: 1,
        padding: '5px 8px',
        border: 'none',
        borderRadius: 5,
        cursor: 'pointer',
        fontFamily: 'Inter',
        fontSize: 11.5,
        fontWeight: 600,
        background: caseView === v ? '#fff' : 'transparent',
        color: caseView === v ? PRIMARY : '#94a29d',
        boxShadow: caseView === v ? '0 1px 2px rgba(0,0,0,.1)' : 'none',
      }}
    >
      {lbl}
    </button>
  );

  const tseg = (v: TrapView, lbl: string) => (
    <button
      key={v}
      onClick={() => setTrapView(v)}
      style={{
        flex: 1,
        padding: '5px 8px',
        border: 'none',
        borderRadius: 5,
        cursor: 'pointer',
        fontFamily: 'Inter',
        fontSize: 11.5,
        fontWeight: 600,
        background: trapView === v ? '#fff' : 'transparent',
        color: trapView === v ? PRIMARY : '#94a29d',
        boxShadow: trapView === v ? '0 1px 2px rgba(0,0,0,.1)' : 'none',
      }}
    >
      {lbl}
    </button>
  );

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 500,
        width: 214,
        background: '#fff',
        borderRadius: 11,
        padding: '11px 13px',
        boxShadow: '0 2px 12px rgba(0,0,0,.16)',
        maxHeight: 'calc(100% - 24px)',
        overflowY: 'auto',
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: '#0f2d27' }}>Map layers</div>
      <Hdr>Current data</Hdr>
      {row('community', 'Breeding site reports', PRIMARY)}
      {row('zones', 'Zone risk heatmap')}
      {row('traps', 'IoT trap network', '#0F6E56')}
      {layers.traps && (
        <div style={{ margin: '2px 0 6px 22px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#94a29d', marginBottom: 4 }}>View</div>
          <div style={{ display: 'flex', gap: 3, background: '#f0f3f2', padding: 3, borderRadius: 7 }}>
            {tseg('traps', 'Traps')}
            {tseg('heatmap', 'Heatmap')}
          </div>
        </div>
      )}
      <Hdr>Analysis layers</Hdr>
      {row('cases', 'Dengue cases')}
      {layers.cases && (
        <div style={{ margin: '2px 0 4px 22px', paddingLeft: 2 }}>
          <div style={{ display: 'flex', gap: 3, background: '#f0f3f2', padding: 3, borderRadius: 7, marginBottom: 8 }}>
            {seg('cluster', 'Clusters')}
            {seg('heatmap', 'Heatmap')}
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#94a29d', marginBottom: 3 }}>
            Reported {fromLbl} — {toLbl}
          </div>
          <div style={{ fontSize: 10, color: '#94a29d', marginBottom: 2 }}>From ({dateFrom}d ago)</div>
          <input
            type="range"
            className="dg-range"
            min={0}
            max={90}
            value={dateFrom}
            onChange={(e) => {
              const f = Math.max(+e.target.value, dateTo + 1);
              setDateRange(f, dateTo);
            }}
            style={{ width: '100%', marginBottom: 6 }}
          />
          <div style={{ fontSize: 10, color: '#94a29d', marginBottom: 2 }}>To ({dateTo}d ago)</div>
          <input
            type="range"
            className="dg-range"
            min={0}
            max={90}
            value={dateTo}
            onChange={(e) => {
              const t = Math.min(+e.target.value, dateFrom - 1);
              setDateRange(dateFrom, Math.max(0, t));
            }}
            style={{ width: '100%' }}
          />
          <div style={{ fontSize: 10.5, color: '#6b7c77', marginTop: 5 }}>
            {filteredCases(cases, dateFrom, dateTo).length} cases in range
          </div>
        </div>
      )}
      {row('forecast', 'Outbreak forecast')}
    </div>
  );
}
