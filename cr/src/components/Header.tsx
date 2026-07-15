import { Brand } from "./icons";
import { LangPills } from "./LangPills";

interface HeaderProps {
  onLogout?: () => void;
}

/** Sticky app header: brand lockup + compact language switcher + logout button. */
export function Header({ onLogout }: HeaderProps) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 16px",
        background: "rgba(250,250,248,.92)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        borderBottom: "1px solid rgba(13,74,62,.07)",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      <Brand />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <LangPills variant="sm" />
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            title="Log out"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px 8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#6b7a74",
              borderRadius: 8,
              transition: "background 0.2s ease, color 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(13,74,62,.06)";
              e.currentTarget.style.color = "#0D4A3E";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "none";
              e.currentTarget.style.color = "#6b7a74";
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        )}
      </div>
    </header>
  );
}
