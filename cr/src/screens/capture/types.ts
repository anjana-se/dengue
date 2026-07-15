export type CaptureStep = "permission" | "camera" | "confirm" | "processing" | "result";
export type GpsStatus = "idle" | "acquiring" | "confirmed" | "failed";

/** "Step N of 3" label used across the capture flow. */
export function stepLabel(step: CaptureStep): string {
  const n = step === "confirm" ? 2 : step === "processing" || step === "result" ? 3 : 1;
  return `Step ${n} of 3`;
}
