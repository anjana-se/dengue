import { useI18n } from "../i18n/LanguageProvider";
import { LangPills } from "../components/LangPills";
import { WelcomeGlyph } from "../components/icons";
import { heroButtonStyle } from "../components/ui";

export function WelcomeScreen({ onGetStarted }: { onGetStarted: () => void }) {
  const { t } = useI18n();
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "32px 24px 28px",
        animation: "dgfade .4s ease",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          gap: 22,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 132,
              height: 132,
              borderRadius: "50%",
              background: "radial-gradient(circle at 50% 38%,#E8F3EC,#DCEBE2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <span
              style={{
                position: "absolute",
                width: 132,
                height: 132,
                borderRadius: "50%",
                border: "2px solid #65A30D",
                animation: "dgring 2.8s ease-out infinite",
              }}
            />
            <WelcomeGlyph />
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: "-.03em",
              color: "#0D4A3E",
              marginTop: 6,
            }}
          >
            DengueGuard
          </div>
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: 27,
            lineHeight: 1.22,
            fontWeight: 700,
            letterSpacing: "-.5px",
            color: "#0D4A3E",
            textWrap: "balance",
          }}
        >
          {t("welcome_headline")}
        </h1>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5, color: "#4b5a54", maxWidth: 300 }}>
          {t("welcome_body")}
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <LangPills variant="lg" />
        <button
          type="button"
          onClick={onGetStarted}
          style={heroButtonStyle("#65A30D", "0 6px 16px rgba(101,163,13,.28)")}
        >
          {t("get_started")}
        </button>
      </div>
    </div>
  );
}
