import { LangPills } from "./LangPills";
import { DengueGuardMark } from "./icons";

interface HeaderProps {
  onLogout?: () => void;
}

export function Header({ onLogout }: HeaderProps) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 16px 10px",
        background: "#FAFAF8",
        borderBottom: "1px solid rgba(13,74,62,.06)",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <DengueGuardMark style={{ width: 32, height: 32 }} />
        <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em", color: "#0D4A3E" }}>
          DengueGuard
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <LangPills />
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            style={{
              padding: "4px 8px",
              fontSize: 12,
              fontWeight: 600,
              color: "#0D4A3E",
              background: "rgba(13,74,62,0.08)",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        )}
      </div>
    </header>
  );
}
