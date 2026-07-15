import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "../../i18n/LanguageProvider";
import { openCamera, stopStream, captureFrame, fileToDataUrl, type CameraError, type CameraErrorCode } from "../../lib/camera";
import { resolveLocation } from "../../lib/geolocation";
import type { AnalysisResult, ResolvedLocation } from "../../types";
import type { ToastState } from "../../components/Toast";
import { PermissionStep } from "./PermissionStep";
import { CameraStep } from "./CameraStep";
import { ConfirmStep } from "./ConfirmStep";
import { ProcessingStep } from "./ProcessingStep";
import { ResultStep } from "./ResultStep";
import { stepLabel, type CaptureStep, type GpsStatus } from "./types";
import { api } from "../../lib/api";

interface CaptureScreenProps {
  onStepChange: (step: CaptureStep) => void;
  showToast: (toast: ToastState) => void;
  onViewReports: () => void;
}

export function CaptureScreen({ onStepChange, showToast, onViewReports }: CaptureScreenProps) {
  const { t, lang } = useI18n();

  const [step, setStep] = useState<CaptureStep>("permission");
  const [gps, setGps] = useState<GpsStatus>("idle");
  const [location, setLocation] = useState<ResolvedLocation | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [guidanceText, setGuidanceText] = useState<string | undefined>(undefined);
  const [cameraError, setCameraError] = useState<CameraErrorCode | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const geoAbort = useRef<AbortController | null>(null);
  const analyzeAbort = useRef<AbortController | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Report the current step up so App can hide/show the header & nav.
  useEffect(() => onStepChange(step), [step, onStepChange]);

  // Camera lifecycle: open the stream while on the camera step, release otherwise.
  useEffect(() => {
    if (step !== "camera") return;
    let cancelled = false;
    let stream: MediaStream | null = null;
    setCameraError(null);
    openCamera()
      .then((s) => {
        if (cancelled) {
          stopStream(s);
          return;
        }
        stream = s;
        streamRef.current = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch((e: CameraError) => {
        if (!cancelled) setCameraError(e.code);
      });
    return () => {
      cancelled = true;
      stopStream(stream);
      streamRef.current = null;
    };
  }, [step]);

  // Abort any in-flight async work on unmount.
  useEffect(
    () => () => {
      geoAbort.current?.abort();
      analyzeAbort.current?.abort();
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      stopStream(streamRef.current);
    },
    [],
  );

  const acquireLocation = useCallback(() => {
    geoAbort.current?.abort();
    const ac = new AbortController();
    geoAbort.current = ac;
    setGps("acquiring");
    resolveLocation(ac.signal)
      .then((loc) => {
        if (!ac.signal.aborted) {
          setLocation(loc);
          setGps("confirmed");
        }
      })
      .catch(() => {
        if (!ac.signal.aborted) setGps("failed");
      });
  }, []);

  const allowLocation = () => {
    setStep("camera");
    acquireLocation();
  };

  const shoot = () => {
    let frame: string | null = null;
    const video = videoRef.current;
    if (video && !cameraError) {
      try {
        frame = captureFrame(video);
      } catch {
        frame = null;
      }
    }
    setPhoto(frame);
    stopStream(streamRef.current);
    setStep("confirm");
  };

  const pickFile = async (file: File) => {
    try {
      const dataUrl = await fileToDataUrl(file);
      setPhoto(dataUrl);
      stopStream(streamRef.current);
      setStep("confirm");
    } catch {
      showToast({ message: t("submit_failed"), kind: "error" });
    }
  };

  const retake = () => {
    setPhoto(null);
    setStep("camera");
  };

  const submitReport = useCallback(
    function submit() {
      if (gps !== "confirmed" || !location || !photo) return;
      setStep("processing");
      analyzeAbort.current?.abort();
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

      const ac = new AbortController();
      analyzeAbort.current = ac;

      api.submitReport(photo, location, description, lang)
        .then((submitRes) => {
          if (ac.signal.aborted) return;
          const reportId = submitRes.report_id;

          // If report is already analysed synchronously (Inngest bypassed)
          if (submitRes.status !== "pending" && submitRes.status !== "processing") {
            api.getReportDetails(reportId)
              .then((repDetails) => {
                if (ac.signal.aborted) return;
                if (repDetails) {
                  setAnalysis({
                    risk: repDetails.risk,
                    confidence: repDetails.confidence,
                    siteType: repDetails.siteType,
                  });
                  setGuidanceText(repDetails.guidanceText);
                  setStep("result");
                }
              })
              .catch(() => {
                if (ac.signal.aborted) return;
                setStep("confirm");
                showToast({
                  message: t("submit_failed"),
                  kind: "error",
                  actionLabel: t("try_again"),
                  onAction: submit,
                });
              });
            return;
          }

          // Otherwise poll the status every 2 seconds
          let attempts = 0;
          pollIntervalRef.current = setInterval(() => {
            attempts++;
            if (attempts > 30) { // Limit polling to 60 seconds
              if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
              setStep("confirm");
              showToast({
                message: "Analysis timed out. Please check your reports list.",
                kind: "error",
              });
              return;
            }

            api.getReportDetails(reportId)
              .then((repDetails) => {
                if (ac.signal.aborted) {
                  if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                  return;
                }
                if (repDetails && repDetails.status !== "processing") {
                  if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                  setAnalysis({
                    risk: repDetails.risk,
                    confidence: repDetails.confidence,
                    siteType: repDetails.siteType,
                  });
                  setGuidanceText(repDetails.guidanceText);
                  setStep("result");
                }
              })
              .catch((err) => {
                console.error("Polling error:", err);
              });
          }, 2000);
        })
        .catch((err) => {
          if (ac.signal.aborted) return;
          setStep("confirm");
          showToast({
            message: err.message || t("submit_failed"),
            kind: "error",
            actionLabel: t("try_again"),
            onAction: submit,
          });
        });
    },
    [gps, location, photo, description, lang, showToast, t],
  );

  const reportAnother = () => {
    setStep("permission");
    setGps("idle");
    setLocation(null);
    setPhoto(null);
    setDescription("");
    setAnalysis(null);
    setGuidanceText(undefined);
    setCameraError(null);
  };

  const label = stepLabel(step);

  if (step === "permission") return <PermissionStep onAllow={allowLocation} />;
  if (step === "camera") {
    return (
      <CameraStep
        videoRef={videoRef}
        cameraError={cameraError}
        gps={gps}
        instruction={t("camera_instruction")}
        stepLabelText={label}
        onShoot={shoot}
        onPickFile={pickFile}
      />
    );
  }
  if (step === "confirm") {
    return (
      <ConfirmStep
        photo={photo}
        gps={gps}
        location={location}
        description={description}
        onDescChange={setDescription}
        stepLabelText={label}
        onRetake={retake}
        onEnableLocation={acquireLocation}
        onSubmit={submitReport}
      />
    );
  }
  if (step === "processing") return <ProcessingStep />;
  return (
    <ResultStep
      risk={analysis?.risk ?? "critical"}
      guidanceText={guidanceText}
      onReportAnother={reportAnother}
      onViewReports={onViewReports}
    />
  );
}
