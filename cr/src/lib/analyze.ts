import type { AnalysisResult } from "../types";

/**
 * Photo risk analysis — SIMULATED.
 *
 * The design has no analysis backend, so this stands in for the server-side
 * vision model that classifies a breeding-site photo. Swap the body for a
 * real call (e.g. POST the image + coordinates to the reports/analysis API)
 * when the backend exists; the signature and return shape are the contract.
 *
 * @param _photo data URL of the captured/selected image (unused by the stub)
 */
export function analyzePhoto(_photo: string, signal?: AbortSignal): Promise<AnalysisResult> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => resolve({ risk: "critical", confidence: 96, siteType: "Discarded tyre" }),
      2600,
    );
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Analysis aborted", "AbortError"));
    });
  });
}
