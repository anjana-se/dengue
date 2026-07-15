import { Brand } from "./icons";
import { LangPills } from "./LangPills";

/** Sticky app header: brand lockup + compact language switcher. */
export function Header() {
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
      <LangPills variant="sm" />
    </header>
  );
}
