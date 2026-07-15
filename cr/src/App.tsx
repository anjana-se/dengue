import { useCallback, useMemo, useState } from "react";
import { Header } from "./components/Header";
import { BottomNav, type AppTab } from "./components/BottomNav";
import { Toast, useToastController } from "./components/Toast";
import { DetailSheet } from "./components/DetailSheet";
import { WelcomeScreen } from "./screens/WelcomeScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { ReportsScreen } from "./screens/ReportsScreen";
import { HelpScreen } from "./screens/HelpScreen";
import { CaptureScreen } from "./screens/capture/CaptureScreen";
import type { CaptureStep } from "./screens/capture/types";
import { MOCK_REPORTS } from "./lib/mock";

type Route = "welcome" | "login" | "app";

export function App() {
  const [route, setRoute] = useState<Route>("welcome");
  const [tab, setTab] = useState<AppTab>("report");
  const [captureStep, setCaptureStep] = useState<CaptureStep>("permission");
  const [detailId, setDetailId] = useState<string | null>(null);
  const { toast, showToast } = useToastController();

  const onCaptureStep = useCallback((step: CaptureStep) => setCaptureStep(step), []);

  const changeTab = useCallback((next: AppTab) => {
    // Re-selecting "Report" starts a fresh capture (the CaptureScreen remounts).
    if (next === "report") setCaptureStep("permission");
    setTab(next);
  }, []);

  const goLogin = useCallback(() => setRoute("login"), []);
  const goApp = useCallback(() => {
    setRoute("app");
    setTab("report");
    setCaptureStep("permission");
  }, []);
  const viewReports = useCallback(() => setTab("reports"), []);

  const isApp = route === "app";
  const isReport = isApp && tab === "report";
  const showHeader = isApp && !(isReport && captureStep === "camera");
  const showNav = isApp && !(isReport && (captureStep === "camera" || captureStep === "processing"));

  const detailReport = useMemo(
    () => (detailId ? MOCK_REPORTS.find((r) => r.id === detailId) ?? null : null),
    [detailId],
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "stretch",
        background: "#e6e9e6",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 480,
          minHeight: "100vh",
          background: "#FAFAF8",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 0 0 1px rgba(13,74,62,.06),0 24px 60px rgba(13,74,62,.14)",
          overflow: "hidden",
        }}
      >
        {showHeader && <Header />}

        <main style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          {route === "welcome" && <WelcomeScreen onGetStarted={goLogin} />}
          {route === "login" && <LoginScreen onLogin={goApp} />}
          {isApp && tab === "report" && (
            <CaptureScreen onStepChange={onCaptureStep} showToast={showToast} onViewReports={viewReports} />
          )}
          {isApp && tab === "reports" && <ReportsScreen onOpenDetail={setDetailId} />}
          {isApp && tab === "help" && <HelpScreen />}
        </main>

        {showNav && <BottomNav active={tab} onChange={changeTab} />}

        {detailReport && <DetailSheet report={detailReport} onClose={() => setDetailId(null)} />}

        <Toast toast={toast} />
      </div>
    </div>
  );
}
