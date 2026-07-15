import type { GeoPoint, ResolvedLocation } from "../types";

/**
 * Real geolocation via the browser `navigator.geolocation` API.
 *
 * SECURITY / COMPLIANCE:
 *  - Geolocation only resolves on secure origins (HTTPS or localhost).
 *  - Coordinates are personal data. This client never persists them; the
 *    calling code should transmit them over TLS to the reports service and
 *    apply data-residency rules there. (Validate against local privacy law —
 *    e.g. Sri Lanka PDPA — with qualified counsel.)
 */

export type GeoErrorCode = "unsupported" | "denied" | "unavailable" | "timeout";

export class GeoError extends Error {
  code: GeoErrorCode;
  constructor(code: GeoErrorCode, message: string) {
    super(message);
    this.name = "GeoError";
    this.code = code;
  }
}

export function geolocationSupported(): boolean {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

/** Resolve the device's current coordinates (no reverse geocoding). */
export function getCurrentPosition(): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (!geolocationSupported()) {
      reject(new GeoError("unsupported", "Geolocation is not supported on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) => {
        const code: GeoErrorCode =
          err.code === err.PERMISSION_DENIED
            ? "denied"
            : err.code === err.TIMEOUT
              ? "timeout"
              : "unavailable";
        reject(new GeoError(code, err.message || "Could not determine location."));
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
    );
  });
}

/**
 * Reverse-geocode coordinates into a human-readable "zone" label.
 *
 * DATA RESIDENCY: this sends the coordinate to OpenStreetMap's public
 * Nominatim service (a third party). Acceptable for a hackathon build; for
 * production, self-host Nominatim or use a contracted provider so location
 * data stays within your compliance boundary. Falls back to a coordinate
 * string when the lookup fails, so the flow never blocks on it.
 */
export async function reverseGeocode(point: GeoPoint, signal?: AbortSignal): Promise<string> {
  const fallback = `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`;
  // Cap the lookup so a slow/blocked geocoder never stalls the confirm step.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  signal?.addEventListener("abort", () => ctrl.abort(), { once: true });
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(point.lat));
    url.searchParams.set("lon", String(point.lng));
    url.searchParams.set("zoom", "16");
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return fallback;
    const data: { address?: Record<string, string>; name?: string } = await res.json();
    const a = data.address ?? {};
    const locality =
      a.suburb || a.neighbourhood || a.village || a.town || a.city_district || a.city || data.name;
    const region = a.city || a.state_district || a.state;
    if (locality && region && locality !== region) return `${region} — ${locality}`;
    return locality || region || fallback;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}

/** Convenience: coordinates + zone label together. */
export async function resolveLocation(signal?: AbortSignal): Promise<ResolvedLocation> {
  const point = await getCurrentPosition();
  const zone = await reverseGeocode(point, signal);
  return { ...point, zone };
}
