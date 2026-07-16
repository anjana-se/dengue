import { useEffect, useRef, useState } from 'react';
import type {
  HeatLayer,
  LayerGroup,
  Map as LMap,
  MarkerCluster,
  MarkerClusterGroup,
  Polygon,
} from 'leaflet';
import L from '../../lib/leaflet';
import { CASE_SEV, PRED_BAND, RISK } from '../../theme';
import { CENTER, PREDICTIONS, ZONES } from '../../data/zones';
import { filteredCases } from '../../utils/cases';
import { casePopupHTML } from './casePopup';
import { useStore } from '../../store/useStore';
import type { Report, WorkOrder } from '../../types';

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

export default function MapView() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LMap | null>(null);
  const zoneLayerRef = useRef<LayerGroup | null>(null);
  const pinLayerRef = useRef<LayerGroup | null>(null);
  const predLayerRef = useRef<LayerGroup | null>(null);
  const caseLayerRef = useRef<LayerGroup | MarkerClusterGroup | null>(null);
  const caseIsClusterRef = useRef(false);
  const heatRef = useRef<HeatLayer | null>(null);
  const pulseTimerRef = useRef<number | null>(null);

  const [ready, setReady] = useState(false);

  // Store slices the map reacts to.
  const view = useStore((s) => s.view);
  const layers = useStore((s) => s.layers);
  const reports = useStore((s) => s.reports);
  const orders = useStore((s) => s.orders);
  const cases = useStore((s) => s.cases);
  const caseView = useStore((s) => s.caseView);
  const dateFrom = useStore((s) => s.dateFrom);
  const dateTo = useStore((s) => s.dateTo);
  const selectZone = useStore((s) => s.selectZone);
  const selectPrediction = useStore((s) => s.selectPrediction);
  const setActiveReport = useStore((s) => s.setActiveReport);
  const setActiveOrder = useStore((s) => s.setActiveOrder);

  const zones = useStore((s) => s.zones);

  // ---- init / teardown ----
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const map = L.map(el, { zoomControl: true, attributionControl: false }).setView(CENTER, 13);
    L.tileLayer(TILE_URL, { maxZoom: 19 }).addTo(map);
    mapRef.current = map;
    zoneLayerRef.current = L.layerGroup().addTo(map);
    pinLayerRef.current = L.layerGroup().addTo(map);
    predLayerRef.current = L.layerGroup().addTo(map);
    caseLayerRef.current = null;
    caseIsClusterRef.current = false;
    setReady(true);
    const t = window.setTimeout(() => map.invalidateSize(), 120);
    return () => {
      window.clearTimeout(t);
      if (pulseTimerRef.current) {
        clearInterval(pulseTimerRef.current);
        pulseTimerRef.current = null;
      }
      map.remove();
      mapRef.current = null;
      caseLayerRef.current = null;
      heatRef.current = null;
      setReady(false);
    };
  }, []);

  // ---- zones ----
  useEffect(() => {
    const g = zoneLayerRef.current;
    if (!ready || !g) return;
    g.clearLayers();
    if (!layers.zones) return;
    zones.forEach((z) => {
      const col = RISK[z.risk_level]?.c || '#94a29d';
      const poly = L.polygon(z.c, { color: col, weight: 1.5, fillColor: col, fillOpacity: 0.32 }).addTo(g);
      poly.on('click', () => selectZone(z));
      poly.bindTooltip(z.name + ' · ' + z.risk_score, { sticky: true, direction: 'top' });
    });
  }, [ready, layers.zones, zones, selectZone]);

  // ---- report / work-order pins ----
  useEffect(() => {
    const g = pinLayerRef.current;
    if (!ready || !g) return;
    g.clearLayers();
    const isWO = view === 'workorders';
    const pool: Array<Report | WorkOrder> = isWO ? orders : reports;
    // Work orders always show their pins; reports are gated by the "Breeding site reports" toggle.
    if (!isWO && layers.community === false) return;
    pool.forEach((r) => {
      const col = RISK[r.risk_level].c;
      const icon = L.divIcon({
        className: '',
        html: `<div class="dg-leaf-pin" style="width:14px;height:14px;background:${col}"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      L.marker([r.lat, r.lng], { icon })
        .addTo(g)
        .on('click', () => {
          if (isWO) setActiveOrder(r as WorkOrder);
          else setActiveReport(r as Report);
        });
    });
  }, [ready, layers.community, view, reports, orders, setActiveOrder, setActiveReport]);

  // ---- outbreak-forecast bands (with pulse animation for emergency zones) ----
  useEffect(() => {
    const g = predLayerRef.current;
    if (!ready || !g) return;
    g.clearLayers();
    if (pulseTimerRef.current) {
      clearInterval(pulseTimerRef.current);
      pulseTimerRef.current = null;
    }
    if (!layers.forecast) return;
    const pulsers: Polygon[] = [];
    PREDICTIONS.forEach((p) => {
      const band = PRED_BAND(p.outbreak_probability);
      if (!band) return;
      const poly = L.polygon(p.c, {
        color: band.fill,
        weight: band.pulse ? 2.5 : 1.5,
        fillColor: band.fill,
        fillOpacity: band.op,
        dashArray: band.pulse ? '6 4' : undefined,
      }).addTo(g);
      poly.on('click', () => selectPrediction(p));
      poly.bindTooltip(p.zone_name + ' · ' + Math.round(p.outbreak_probability * 100) + '%', {
        sticky: true,
        direction: 'top',
      });
      if (band.pulse) pulsers.push(poly);
    });
    if (pulsers.length) {
      let on = false;
      pulseTimerRef.current = window.setInterval(() => {
        on = !on;
        pulsers.forEach((pl) => pl.setStyle({ color: on ? '#fff' : '#EF4444', weight: on ? 3.5 : 2.5 }));
      }, 750);
    }
    return () => {
      if (pulseTimerRef.current) {
        clearInterval(pulseTimerRef.current);
        pulseTimerRef.current = null;
      }
    };
  }, [ready, layers.forecast, selectPrediction]);

  // ---- confirmed dengue cases (cluster / heatmap) ----
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;

    const canCluster = typeof L.markerClusterGroup === 'function';
    if (!caseLayerRef.current || (canCluster && !caseIsClusterRef.current)) {
      if (caseLayerRef.current && map.hasLayer(caseLayerRef.current)) map.removeLayer(caseLayerRef.current);
      caseLayerRef.current = canCluster
        ? L.markerClusterGroup({
            maxClusterRadius: 50,
            iconCreateFunction: (cl: MarkerCluster) => {
              const n = cl.getChildCount();
              const t = Math.min(1, n / 25);
              const col = t < 0.4 ? '#3B82F6' : t < 0.7 ? '#F59E0B' : '#DC2626';
              const sz = n < 10 ? 34 : n < 25 ? 42 : 50;
              return L.divIcon({
                html: `<div class="dg-cluster" style="width:${sz}px;height:${sz}px;background:${col};font-size:${n > 99 ? 12 : 14}px">${n}</div>`,
                className: '',
                iconSize: [sz, sz],
              });
            },
          })
        : L.layerGroup();
      caseIsClusterRef.current = canCluster;
    }

    const layer = caseLayerRef.current;
    layer.clearLayers();
    if (map.hasLayer(layer)) map.removeLayer(layer);
    if (heatRef.current) {
      map.removeLayer(heatRef.current);
      heatRef.current = null;
    }
    if (!layers.cases) return;

    const cs = filteredCases(cases, dateFrom, dateTo);
    if (caseView === 'heatmap' && typeof L.heatLayer === 'function') {
      const pts = cs.map((c) => [c.lat, c.lng, CASE_SEV[c.severity].w] as [number, number, number]);
      heatRef.current = L.heatLayer(pts, {
        radius: 25,
        blur: 20,
        maxZoom: 13,
        gradient: { 0.2: '#2563EB', 0.4: '#60A5FA', 0.6: '#F59E0B', 0.8: '#FB923C', 1.0: '#DC2626' },
      }).addTo(map);
    } else {
      cs.forEach((c) => {
        const col = CASE_SEV[c.severity].c;
        const m = L.marker([c.lat, c.lng], {
          icon: L.divIcon({
            className: '',
            html: `<div class="dg-case-dot" style="width:12px;height:12px;background:${col}"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6],
          }),
        });
        m.bindPopup(casePopupHTML(c), { maxWidth: 230, minWidth: 210 });
        layer.addLayer(m);
      });
      map.addLayer(layer);
    }
  }, [ready, layers.cases, caseView, dateFrom, dateTo, cases]);

  // ---- keep the map sized correctly when the column width changes ----
  useEffect(() => {
    if (!ready) return;
    const id = window.setTimeout(() => mapRef.current?.invalidateSize(), 80);
    return () => window.clearTimeout(id);
  }, [ready, view]);

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />;
}
