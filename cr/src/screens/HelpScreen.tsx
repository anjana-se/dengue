import { useState } from "react";
import { useI18n } from "../i18n/LanguageProvider";
import type { StringKey } from "../i18n/strings";

const FAQ_KEYS: { q: StringKey; a: StringKey }[] = [
  { q: "q1", a: "a1" },
  { q: "q2", a: "a2" },
  { q: "q3", a: "a3" },
  { q: "q4", a: "a4" },
  { q: "q5", a: "a5" },
];

export function HelpScreen() {
  const { t } = useI18n();
  const [open, setOpen] = useState(0);

  return (
    <div style={{ flex: 1, padding: "18px 16px 24px", animation: "dgfade .35s ease" }}>
      <h1 style={{ margin: "0 0 16px", fontSize: 22, fontWeight: 700, color: "#0D4A3E" }}>{t("help_title")}</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {FAQ_KEYS.map(({ q, a }, i) => {
          const isOpen = open === i;
          return (
            <div key={q} style={{ background: "#fff", border: "1px solid rgba(13,74,62,.08)", borderRadius: 14, overflow: "hidden" }}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? -1 : i)}
                aria-expanded={isOpen}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "15px 16px",
                  background: "none",
                  border: "none",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <span style={{ fontSize: 15, fontWeight: 600, color: "#1c2b26", lineHeight: 1.35 }}>{t(q)}</span>
                <span
                  style={{
                    flex: "none",
                    display: "flex",
                    transition: "transform .25s ease",
                    transform: `rotate(${isOpen ? 180 : 0}deg)`,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M6 9l6 6 6-6" stroke="#0D4A3E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </button>
              <div
                style={{
                  overflow: "hidden",
                  transition: "max-height .3s ease,opacity .25s ease",
                  maxHeight: isOpen ? 260 : 0,
                  opacity: isOpen ? 1 : 0,
                }}
              >
                <p style={{ margin: 0, padding: "0 16px 16px", fontSize: 14, lineHeight: 1.55, color: "#546056" }}>
                  {t(a)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 20, padding: 16, background: "#F0F6F2", borderRadius: 14, textAlign: "center" }}>
        <p style={{ margin: "0 0 10px", fontSize: 14, color: "#33433c", lineHeight: 1.45 }}>{t("contact_label")}</p>
        <div style={{ display: "flex", gap: 9, justifyContent: "center" }}>
          <a
            href="tel:+941234567"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 15px",
              background: "#fff",
              borderRadius: 10,
              textDecoration: "none",
              color: "#0D4A3E",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M5 4h3l2 5-2 1.5a11 11 0 0 0 5 5L18 13l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"
                fill="#0D4A3E"
              />
            </svg>
            117
          </a>
          <a
            href="mailto:info@dengue.gov.lk"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 15px",
              background: "#fff",
              borderRadius: 10,
              textDecoration: "none",
              color: "#0D4A3E",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="#0D4A3E" strokeWidth="1.7" />
              <path d="M4 7l8 6 8-6" stroke="#0D4A3E" strokeWidth="1.7" strokeLinejoin="round" />
            </svg>
            Email
          </a>
        </div>
      </div>
    </div>
  );
}
