import type { CSSProperties } from "react";

/** Small water-drop glyph used inside the square brand logo (header / login). */
export function DropGlyph({ size = 18, drop = "#65A30D" }: { size?: number; drop?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3c0 6-6 8.5-6 13a6 6 0 0 0 12 0c0-4.5-6-7-6-13z" fill={drop} />
      <circle cx="10" cy="15" r="1.6" fill="#fff" opacity=".85" />
    </svg>
  );
}

/** The DengueGuard logo lockup: rounded green square + drop + wordmark. */
export function Brand({ compact = false }: { compact?: boolean }) {
  const box = compact ? 30 : 32;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <div
        style={{
          width: box,
          height: box,
          borderRadius: 9,
          background: "#0D4A3E",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "none",
        }}
      >
        <DropGlyph size={compact ? 17 : 18} />
      </div>
      <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-.2px", color: "#0D4A3E" }}>
        DengueGuard
      </span>
    </div>
  );
}

export function DengueGuardMark({ style }: { style?: CSSProperties }) {
  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 9,
        background: "#0D4A3E",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "none",
        ...style,
      }}
    >
      <DropGlyph size={18} />
    </div>
  );
}

export function DengueGuardLogo({ style }: { style?: CSSProperties }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 9, ...style }}>
      <DengueGuardMark style={{ width: 34, height: 34 }} />
      <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: "-.02em", color: "#0D4A3E" }}>
        DengueGuard
      </span>
    </div>
  );
}

/** Large gradient drop used on the welcome hero. */
export function WelcomeGlyph() {
  return (
    <svg width="66" height="66" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2.5c0 7-7 9.8-7 15a7 7 0 0 0 14 0c0-5.2-7-8-7-15z"
        fill="#0D4A3E"
      />
      <path
        d="M12 2.5c0 7-7 9.8-7 15a7 7 0 0 0 14 0c0-5.2-7-8-7-15z"
        fill="url(#dg-welcome-grad)"
        opacity=".18"
      />
      <circle cx="9.4" cy="17" r="2" fill="#fff" opacity=".9" />
      <defs>
        <linearGradient id="dg-welcome-grad" x1="5" y1="2" x2="19" y2="24">
          <stop stopColor="#65A30D" />
          <stop offset="1" stopColor="#0D4A3E" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export type NavIconName = "report" | "reports" | "help";

/** Bottom-nav icons, coloured by active state (mirrors the design's `icon()`). */
export function NavIcon({ name, active }: { name: NavIconName; active: boolean }) {
  const c = active ? "#0D4A3E" : "#9aa8a2";
  const w = active ? 2.1 : 1.8;
  const common = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none" } as const;
  if (name === "report") {
    return (
      <svg {...common} aria-hidden="true">
        <rect x="3" y="6" width="18" height="14" rx="3" stroke={c} strokeWidth={w} />
        <circle cx="12" cy="13" r="3.6" stroke={c} strokeWidth={w} />
        <path d="M8 6l1.4-2.4h5L16 6" stroke={c} strokeWidth={w} strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "reports") {
    return (
      <svg {...common} aria-hidden="true">
        <rect x="4" y="3" width="16" height="18" rx="2.5" stroke={c} strokeWidth={w} />
        <path d="M8 8h8M8 12h8M8 16h5" stroke={c} strokeWidth={w} strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg {...common} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke={c} strokeWidth={w} />
      <path
        d="M9.5 9.2a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.7-.9 1.5M12 16.5h.01"
        stroke={c}
        strokeWidth={w}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** A stylised illustration of a breeding site — stands in for a photo thumbnail. */
export function SitePhotoArt({ style }: { style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 390 300" preserveAspectRatio="xMidYMid slice" style={style} aria-hidden="true">
      <rect width="390" height="300" fill="#1a2620" />
      <rect y="205" width="390" height="95" fill="#26332b" />
      <ellipse cx="195" cy="180" rx="150" ry="110" fill="#0f1713" />
      <ellipse cx="195" cy="180" rx="150" ry="110" fill="none" stroke="#3a4a41" strokeWidth="26" />
      <ellipse cx="195" cy="178" rx="112" ry="80" fill="#0a1f22" />
      <ellipse cx="195" cy="174" rx="98" ry="66" fill="#12343a" />
      <ellipse cx="170" cy="160" rx="52" ry="24" fill="#20505a" opacity=".55" />
      <circle cx="150" cy="180" r="2.4" fill="#8fd0d8" />
      <circle cx="212" cy="196" r="2" fill="#8fd0d8" />
      <circle cx="235" cy="166" r="2.2" fill="#8fd0d8" />
    </svg>
  );
}
