import { useI18n } from "../i18n/LanguageProvider";
import { NavIcon, type NavIconName } from "./icons";

export type AppTab = "report" | "reports" | "help";

const TABS: { tab: AppTab; icon: NavIconName; labelKey: "nav_report" | "nav_reports" | "nav_help" }[] = [
  { tab: "report", icon: "report", labelKey: "nav_report" },
  { tab: "reports", icon: "reports", labelKey: "nav_reports" },
  { tab: "help", icon: "help", labelKey: "nav_help" },
];

export function BottomNav({ active, onChange }: { active: AppTab; onChange: (tab: AppTab) => void }) {
  const { t } = useI18n();
  return (
    <nav
      style={{
        display: "flex",
        background: "rgba(250,250,248,.95)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        borderTop: "1px solid rgba(13,74,62,.08)",
        position: "sticky",
        bottom: 0,
        zIndex: 20,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {TABS.map(({ tab, icon, labelKey }) => {
        const isActive = active === tab;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onChange(tab)}
            aria-current={isActive ? "page" : undefined}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              padding: "9px 0 8px",
              background: "none",
              border: "none",
              cursor: "pointer",
              position: "relative",
              minHeight: 56,
              justifyContent: "center",
            }}
          >
            <NavIcon name={icon} active={isActive} />
            <span style={{ fontSize: 11, fontWeight: 600, color: isActive ? "#0D4A3E" : "#9aa8a2" }}>
              {t(labelKey)}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
