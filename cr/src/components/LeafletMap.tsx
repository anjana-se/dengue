import { useEffect, useRef } from "react";
import L from "leaflet";
import type { GeoPoint } from "../types";

const PIN_HTML = `<div style="transform:translate(-50%,-100%)"><svg width="34" height="42" viewBox="0 0 34 42"><path d="M17 0C8 0 1 7 1 16c0 11 16 26 16 26s16-15 16-26C33 7 26 0 17 0z" fill="#0D4A3E"/><circle cx="17" cy="16" r="6" fill="#65A30D"/></svg></div>`;

/**
 * Non-interactive Leaflet map centred on the report location, with a pin.
 * Mirrors the design's `syncMap`: OSM tiles, gestures disabled, custom marker.
 */
export function LeafletMap({ point, height = 170 }: { point: GeoPoint; height?: number }) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    const el = elRef.current;
    if (!el || mapRef.current) return;

    const map = L.map(el, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      touchZoom: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
    }).setView([point.lat, point.lng], 16);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    const icon = L.divIcon({ className: "", html: PIN_HTML, iconSize: [0, 0] });
    markerRef.current = L.marker([point.lat, point.lng], { icon, interactive: false }).addTo(map);

    // Leaflet needs a nudge when it mounts inside an animating/late-sized box.
    const raf = window.setTimeout(() => map.invalidateSize(), 80);
    mapRef.current = map;

    return () => {
      window.clearTimeout(raf);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Intentionally run once; position updates handled in the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the view + pin in sync if the resolved coordinates change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([point.lat, point.lng], 16);
    markerRef.current?.setLatLng([point.lat, point.lng]);
  }, [point.lat, point.lng]);

  return <div ref={elRef} className="lf-map" style={{ height, width: "100%" }} aria-label="Map showing the report location" />;
}
