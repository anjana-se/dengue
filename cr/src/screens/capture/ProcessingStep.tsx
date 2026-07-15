import { useI18n } from "../../i18n/LanguageProvider";

export function ProcessingStep() {
  const { t } = useI18n();
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "40px 30px",
        textAlign: "center",
        animation: "dgfade .3s ease",
      }}
    >
      <div
        style={{
          width: 104,
          height: 104,
          borderRadius: "50%",
          background: "#E8F3EC",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 28,
          position: "relative",
        }}
      >
        <span
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: "2px solid #65A30D",
            animation: "dgring 2s ease-out infinite",
          }}
        />
        <svg width="46" height="46" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="6" width="18" height="14" rx="3" stroke="#0D4A3E" strokeWidth="1.8" />
          <circle cx="12" cy="13" r="4" stroke="#0D4A3E" strokeWidth="1.8" />
          <path d="M8 6l1.5-2.5h5L16 6" stroke="#0D4A3E" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 600, color: "#0D4A3E" }}>
        {t("submit_processing")}
      </h2>
      <div style={{ display: "flex", gap: 9 }}>
        {[0, 0.2, 0.4].map((d) => (
          <span
            key={d}
            style={{
              width: 11,
              height: 11,
              borderRadius: "50%",
              background: "#65A30D",
              animation: `dgpulse 1.2s infinite ${d}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
