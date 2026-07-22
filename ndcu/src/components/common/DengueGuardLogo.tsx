import type { CSSProperties } from "react";

export function DropGlyph({ size = 18, drop = "#65A30D" }: { size?: number; drop?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3c0 6-6 8.5-6 13a6 6 0 0 0 12 0c0-4.5-6-7-6-13z" fill={drop} />
      <circle cx="10" cy="15" r="1.6" fill="#fff" opacity=".85" />
    </svg>
  );
}

export function DengueGuardMark({ size = 34, style }: { size?: number; style?: CSSProperties }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        background: "#0D4A3E",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "none",
        ...style,
      }}
    >
      <DropGlyph size={Math.round(size * 0.53)} />
    </div>
  );
}

export function DengueGuardLogo({
  style,
  markSize = 34,
  textSize = 20,
  textColor = "#0D4A3E",
  subTitle,
  subTitleColor = "#6B7280",
}: {
  style?: CSSProperties;
  markSize?: number;
  textSize?: number;
  textColor?: string;
  subTitle?: string;
  subTitleColor?: string;
}) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 10, ...style }}>
      <DengueGuardMark size={markSize} />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span
          style={{
            fontWeight: 800,
            fontSize: textSize,
            letterSpacing: "-.02em",
            color: textColor,
            lineHeight: 1.1,
          }}
        >
          DengueGuard
        </span>
        {subTitle && (
          <span
            style={{
              fontSize: Math.max(10, Math.round(textSize * 0.55)),
              fontWeight: 500,
              color: subTitleColor,
              marginTop: 2,
            }}
          >
            {subTitle}
          </span>
        )}
      </div>
    </div>
  );
}
