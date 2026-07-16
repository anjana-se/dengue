import { RISK } from '../../theme';
import type { RiskLevel } from '../../types';

/** Risk-level pill with a coloured dot, e.g. "● Critical". */
export default function Badge({ level }: { level: RiskLevel }) {
  const r = RISK[level];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 9px',
        borderRadius: 20,
        background: r.bg,
        color: r.c,
        fontSize: 11.5,
        fontWeight: 700,
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: r.c }} />
      {r.label}
    </span>
  );
}
