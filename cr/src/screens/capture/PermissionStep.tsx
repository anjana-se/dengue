import { useI18n } from "../../i18n/LanguageProvider";
import { heroButtonStyle } from "../../components/ui";

export function PermissionStep({ onAllow }: { onAllow: () => void }) {
  const { t } = useI18n();
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "32px 26px",
        textAlign: "center",
        animation: "dgfade .35s ease",
      }}
    >
      <div
        style={{
          width: 88,
          height: 88,
          borderRadius: 24,
          background: "#E8F3EC",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 24px",
        }}
      >
        <svg width="42" height="42" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 2c-4 0-7 3-7 7 0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z" fill="#0D4A3E" />
          <circle cx="12" cy="9" r="2.6" fill="#65A30D" />
        </svg>
      </div>
      <h2 style={{ margin: "0 0 12px", fontSize: 22, fontWeight: 700, color: "#0D4A3E" }}>
        {t("location_permission_title")}
      </h2>
      <p
        style={{
          margin: "0 auto 30px",
          fontSize: 16,
          lineHeight: 1.5,
          color: "#4b5a54",
          maxWidth: 300,
        }}
      >
        {t("location_permission_body")}
      </p>
      <button type="button" onClick={onAllow} style={heroButtonStyle("#0D4A3E", "0 6px 16px rgba(13,74,62,.24)")}>
        {t("location_permission_cta")}
      </button>
      <p style={{ margin: "18px 0 0", fontSize: 13, lineHeight: 1.45, color: "#8a978f" }}>
        {t("location_permission_note")}
      </p>
    </div>
  );
}
