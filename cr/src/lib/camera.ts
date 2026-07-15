/**
 * Real camera access via `navigator.mediaDevices.getUserMedia`.
 *
 * SECURITY / COMPLIANCE:
 *  - getUserMedia only works on secure origins (HTTPS or localhost).
 *  - The captured frame is a photo of a public/private location and may be
 *    sensitive. This client holds it only in memory (a data URL) until the
 *    user submits; nothing is uploaded automatically. Strip EXIF and apply
 *    retention rules server-side.
 */

export type CameraErrorCode = "unsupported" | "denied" | "notfound" | "error";

export class CameraError extends Error {
  code: CameraErrorCode;
  constructor(code: CameraErrorCode, message: string) {
    super(message);
    this.name = "CameraError";
    this.code = code;
  }
}

export function cameraSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function"
  );
}

/** Open the rear camera stream. Caller is responsible for stopping tracks. */
export async function openCamera(): Promise<MediaStream> {
  if (!cameraSupported()) {
    throw new CameraError("unsupported", "Camera is not supported on this device or origin.");
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 1280 } },
      audio: false,
    });
  } catch (e) {
    const name = (e as DOMException)?.name;
    const code: CameraErrorCode =
      name === "NotAllowedError" || name === "SecurityError"
        ? "denied"
        : name === "NotFoundError" || name === "OverconstrainedError"
          ? "notfound"
          : "error";
    throw new CameraError(code, (e as Error)?.message || "Could not open the camera.");
  }
}

export function stopStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((t) => t.stop());
}

/**
 * Grab the current video frame as a square-ish JPEG data URL.
 * Center-crops to a square to match the design's framing guide.
 */
export function captureFrame(video: HTMLVideoElement, maxSize = 1080): string {
  const vw = video.videoWidth || 720;
  const vh = video.videoHeight || 720;
  const side = Math.min(vw, vh);
  const size = Math.min(side, maxSize);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new CameraError("error", "Canvas 2D context unavailable.");

  const sx = (vw - side) / 2;
  const sy = (vh - side) / 2;
  ctx.drawImage(video, sx, sy, side, side, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", 0.85);
}

/** Read a user-picked gallery file into a data URL. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new CameraError("error", "Could not read the selected image."));
    reader.readAsDataURL(file);
  });
}
