import type { CSSProperties } from "react";
import { useI18n } from "../i18n/LanguageProvider";
import { LANGS, LANG_PILL } from "../i18n/strings";

function pillStyle(active: boolean, lg: boolean): CSSProperties {
  const base: CSSProperties = {
    borderRadius: 999,
    fontWeight: 600,
    cursor: "pointer",
    fontSize: lg ? 14 : 12,
    padding: lg ? "9px 16px" : "5px 11px",
    border: lg ? `1.5px solid ${active ? "#0D4A3E" : "#d5ddd7"}` : "none",
  };
  if (active) return { ...base, background: "#0D4A3E", color: "#fff" };
  return lg
    ? { ...base, background: "#fff", color: "#3d4c46" }
    : { ...base, background: "transparent", color: "#6b7a74" };
}

/** Language switcher. `sm` is the pill group in the header; `lg` is the welcome variant. */
export function LangPills({ variant = "sm" }: { variant?: "sm" | "lg" }) {
  const { lang, setLang } = useI18n();
  const lg = variant === "lg";

  const wrapStyle: CSSProperties = lg
    ? { display: "flex", gap: 8, justifyContent: "center" }
    : { display: "flex", gap: 4, background: "#EEF1EE", borderRadius: 999, padding: 3 };

  return (
    <div style={wrapStyle} role="group" aria-label="Language">
      {LANGS.map((code) => {
        const active = lang === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            aria-pressed={active}
            style={pillStyle(active, lg)}
          >
            {lg ? LANG_PILL[code].long : LANG_PILL[code].short}
          </button>
        );
      })}
    </div>
  );
}
