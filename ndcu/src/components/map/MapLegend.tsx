import type { CSSProperties, ReactNode } from 'react';
import { CASE_SEV, RISK } from '../../theme';
import { useStore } from '../../store/useStore';

function Swatch({ c, label, extra }: { c: string; label: string; extra?: CSSProperties }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: '#334b45', padding: '1px 0' }}>
      <span style={{ width: 11, height: 11, borderRadius: 3, background: c, flexShrink: 0, border: '1px solid rgba(0,0,0,.08)', ...extra }} />
      {label}
    </div>
  );
}

function Dot({ c, label }: { c: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: '#334b45', padding: '1px 0' }}>
      <span style={{ width: 11, height: 11, borderRadius: '50%', background: c, border: '2px solid #fff', boxShadow: '0 0 0 1px rgba(0,0,0,.15)', flexShrink: 0 }} />
      {label}
    </div>
  );
}

function Sec({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 9.5, fontWeight: 700, color: '#94a29d', textTransform: 'uppercase', letterSpacing: '.05em', margin: '7px 0 3px' }}>
      {children}
    </div>
  );
}

export default function MapLegend() {
  const layers = useStore((s) => s.layers);
  const open = useStore((s) => s.legendOpen);
  const setLegendOpen = useStore((s) => s.setLegendOpen);

  const rows: ReactNode[] = [];
  if (layers.community !== false) {
    rows.push(<Sec key="s-rep">Breeding site reports</Sec>);
    (['critical', 'high', 'medium', 'low'] as const).forEach((k) => rows.push(<Dot key={'r-' + k} c={RISK[k].c} label={RISK[k].label} />));
  }
  if (layers.zones) {
    rows.push(<Sec key="s-zone">Zone shading</Sec>);
    rows.push(
      <div key="zz" style={{ fontSize: 10.5, color: '#334b45', lineHeight: 1.35 }}>
        Fill colour = zone risk level (red = high, green = low)
      </div>,
    );
  }
  if (layers.cases) {
    rows.push(<Sec key="s-case">Dengue cases</Sec>);
    (['mild', 'moderate', 'severe'] as const).forEach((k) => rows.push(<Dot key={'c-' + k} c={CASE_SEV[k].c} label={CASE_SEV[k].label} />));
  }
  if (layers.forecast) {
    rows.push(<Sec key="s-fc">14-day outbreak risk</Sec>);
    (
      [
        ['#FEF08A', '0.40–0.60 · Watch'],
        ['#FCD34D', '0.60–0.75'],
        ['#FB923C', '0.75–0.90 · Warning'],
        ['#EF4444', '≥ 0.90 · Emergency'],
      ] as [string, string][]
    ).forEach(([c, l]) => rows.push(<Swatch key={'f-' + l} c={c} label={l} />));
  }
  if (layers.traps) {
    rows.push(<Sec key="s-trap">IoT traps</Sec>);
    (
      [
        ['#0F6E56', 'Active'],
        ['#888780', 'Offline'],
        ['#F59E0B', 'Maintenance'],
      ] as [string, string][]
    ).forEach(([c, l]) => rows.push(<Swatch key={'t-' + l} c={c} label={l} extra={{ borderRadius: 2 }} />));
  }
  if (!rows.length) {
    rows.push(
      <div key="none" style={{ fontSize: 10.5, color: '#94a29d' }}>
        Enable a layer to see its key.
      </div>,
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 12,
        right: 12,
        zIndex: 500,
        width: open ? 178 : 'auto',
        background: '#fff',
        borderRadius: 10,
        boxShadow: '0 2px 12px rgba(0,0,0,.16)',
        overflow: 'hidden',
      }}
    >
      <div
        onClick={() => setLegendOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: open ? '9px 12px 5px' : '7px 11px',
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 11.5, fontWeight: 700, color: '#0f2d27' }}>Legend</span>
        <span style={{ fontSize: 13, color: '#94a29d', lineHeight: 1 }}>{open ? '–' : '+'}</span>
      </div>
      {open && <div style={{ padding: '0 12px 11px', maxHeight: '46vh', overflowY: 'auto' }}>{rows}</div>}
    </div>
  );
}
