import { useEffect, useRef } from "react";
import L from "leaflet";
import type { GeoPoint } from "../types";

const PIN_HTML = `<div style="transform:translate(-50%,-100%)"><svg width="34" height="42" viewBox="0 0 34 42"><path d="M17 0C8 0 1 7 1 16c0 11 16 26 16 26s16-15 16-26C33 7 26 0 17 0z" fill="#0D4A3E"/><circle cx="17" cy="16" r="6" fill="#65A30D"/></svg></div>`;

interface LeafletMapProps {
  point: GeoPoint;
  height?: number;
  /** When true, the map pans/zooms and the pin can be dragged or tapped to move. */
  editable?: boolean;
  /** Fired with the new coordinates when the user drags the pin or taps the map. */
  onPointChange?: (point: GeoPoint) => void;
}

/**
 * Leaflet map centred on the report location, with a pin.
 * Read-only by default (mirrors the design's `syncMap`: OSM tiles, gestures
 * disabled). When `editable`, gestures are enabled and the pin can be dragged
 * or the map tapped to reposition it, reporting changes via `onPointChange`.
 */
export function LeafletMap({ point, height = 170, editable = false, onPointChange }: LeafletMapProps) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const zoomCtrlRef = useRef<L.Control.Zoom | null>(null);
  // Keep the latest callback so map/marker handlers never read a stale closure.
  const onChangeRef = useRef<LeafletMapProps["onPointChange"]>(onPointChange);
  onChangeRef.current = onPointChange;

  const icon = L.divIcon({ className: "", html: PIN_HTML, iconSize: [0, 0] });

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

    markerRef.current = L.marker([point.lat, point.lng], { icon, interactive: false }).addTo(map);

    // Tapping the map (in editable mode) drops the pin there.
    map.on("click", (e: L.LeafletMouseEvent) => {
      if (!onChangeRef.current) return;
      const { lat, lng } = e.latlng;
      markerRef.current?.setLatLng([lat, lng]);
      onChangeRef.current({ lat, lng });
    });

    // Leaflet needs a nudge when it mounts inside an animating/late-sized box.
    const raf = window.setTimeout(() => map.invalidateSize(), 80);
    mapRef.current = map;

    return () => {
      window.clearTimeout(raf);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      zoomCtrlRef.current = null;
    };
    // Intentionally run once; position updates handled in the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toggle interactivity when `editable` changes (preserves current view/zoom).
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    const gestures = ["dragging", "touchZoom", "scrollWheelZoom", "doubleClickZoom", "boxZoom", "keyboard"] as const;
    for (const g of gestures) editable ? map[g].enable() : map[g].disable();

    if (editable && !zoomCtrlRef.current) {
      zoomCtrlRef.current = L.control.zoom({ position: "bottomright" });
      map.addControl(zoomCtrlRef.current);
    } else if (!editable && zoomCtrlRef.current) {
      map.removeControl(zoomCtrlRef.current);
      zoomCtrlRef.current = null;
    }

    // The marker must be interactive & draggable to be grabbed. Recreate it so
    // Leaflet picks up the changed `interactive` option.
    const { lat, lng } = marker.getLatLng();
    marker.remove();
    const next = L.marker([lat, lng], { icon, interactive: editable, draggable: editable }).addTo(map);
    markerRef.current = next;
    if (editable) {
      next.on("dragend", () => {
        const p = next.getLatLng();
        onChangeRef.current?.({ lat: p.lat, lng: p.lng });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editable]);

  // Keep the view + pin in sync if the coordinates change externally.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([point.lat, point.lng], map.getZoom());
    markerRef.current?.setLatLng([point.lat, point.lng]);
  }, [point.lat, point.lng]);

  return (
    <div
      ref={elRef}
      className="lf-map"
      style={{ height, width: "100%" }}
      aria-label="Map showing the report location"
    />
  );
}
