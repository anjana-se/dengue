export type CaptureStep = "permission" | "camera" | "confirm" | "processing" | "result";
export type GpsStatus = "idle" | "acquiring" | "confirmed" | "failed";

/** "Step N of 2" label shown on the camera (1) and confirm (2) steps. */
export function stepLabel(step: CaptureStep): string {
  const n = step === "confirm" ? 2 : 1;
  return `Step ${n} of 2`;
}
