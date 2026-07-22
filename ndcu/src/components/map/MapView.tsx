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
import { CASE_SEV, PRED_BAND, RISK, TRAP_STATUS } from '../../theme';
import { CENTER, PREDICTIONS } from '../../data/zones';
import { filteredCases } from '../../utils/cases';
import { casePopupHTML } from './casePopup';
import { trapPopupHTML } from './trapPopup';
import { useStore } from '../../store/useStore';
import IncidentPopup from './IncidentPopup';
import type { Report, WorkOrder, Zone } from '../../types';

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const NSDI_SERVICE = 'https://gisapps.nsdi.gov.lk/server/rest/services/Srilanka/Boundaries/MapServer';

// Ray-casting algorithm to check if point falls within polygon boundary
function isPointInPolygon(pt: [number, number], poly: [number, number][]) {
  const x = pt[0], y = pt[1];
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > y) !== (yj > y))
      && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// JSONP helper to query Esri MapServer bypassing CORS
function jsonp(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const cbName = '__nsdi_cb_' + Math.floor(Math.random() * 1000000);
    const script = document.createElement('script');
    let settled = false;

    (window as any)[cbName] = (data: any) => {
      if (settled) return;
      settled = true;
      try { delete (window as any)[cbName]; } catch { }
      script.remove();
      resolve(data);
    };

    script.onerror = () => {
      if (settled) return;
      settled = true;
      script.remove();
      reject(new Error('Boundary service lookup failed'));
    };

    const sep = url.includes('?') ? '&' : '?';
    script.src = `${url}${sep}callback=${cbName}`;
    document.body.appendChild(script);

    setTimeout(() => {
      if (settled) return;
      settled = true;
      script.remove();
      reject(new Error('Boundary service lookup timed out'));
    }, 12000);
  });
}

interface BoundaryInfo {
  coords: [number, number][][];
  name: string;
  district?: string;
  province?: string;
}

// Fetch boundary geometry and attributes from official Survey Department / NSDI server
async function fetchBoundaryGeometry(lat: number, lng: number, layerId: number): Promise<BoundaryInfo | null> {
  const geom = `${lng},${lat}`;
  const url = `${NSDI_SERVICE}/identify`
    + `?geometry=${geom}`
    + `&geometryType=esriGeometryPoint`
    + `&sr=4326`
    + `&layers=all:${layerId}`
    + `&tolerance=8`
    + `&mapExtent=${lng - 0.015},${lat - 0.015},${lng + 0.015},${lat + 0.015}`
    + `&imageDisplay=800,600,96`
    + `&returnGeometry=true`
    + `&f=json`;

  try {
    const res = await jsonp(url);
    if (res && res.results && res.results.length > 0) {
      const feature = res.results[0];
      const geometry = feature.geometry;
      const attrs = feature.attributes || {};
      if (geometry && geometry.rings && geometry.rings.length > 0) {
        const coords = geometry.rings.map((ring: [number, number][]) =>
          ring.map((pt: [number, number]) => [pt[1], pt[0]] as [number, number])
        );
        const name = attrs['GND Name'] || attrs.gnd_name || attrs.ds_division_name || attrs.district_name || attrs.province_name || feature.value || 'Unknown';
        const district = attrs['District Name'] || attrs.district_name || attrs.District_Name;
        const province = attrs['Province Name'] || attrs.province_name || attrs.Province_Name;

        return { coords, name, district, province };
      }
    }
  } catch (e) {
    console.warn('Failed to query boundary coordinates for layer', layerId, e);
  }
  return null;
}

// Get dynamic styling properties based on Zoom level and Risk level/score
function getZoneStyle(zoom: number, riskLevel: string, riskScore: number) {
  const colorMap = {
    critical: { color: '#991B1B', fillColor: '#EF4444' },
    high:     { color: '#C2410C', fillColor: '#F97316' },
    medium:   { color: '#854D0E', fillColor: '#EAB308' },
    low:      { color: '#065F46', fillColor: '#10B981' },
  };
  const c = colorMap[riskLevel as keyof typeof colorMap] || (riskScore >= 40 ? colorMap.medium : colorMap.low);

  let weight = 2.0;
  let fillOpacity = 0.25;

  if (zoom <= 10) {
    weight = 3.0;
    fillOpacity = 0.35;
  } else if (zoom <= 13) {
    weight = 2.5;
    fillOpacity = 0.30;
  }

  return {
    color: c.color,
    weight,
    fillColor: c.fillColor,
    fillOpacity,
  };
}

export default function MapView() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LMap | null>(null);
  const zoneLayerRef = useRef<LayerGroup | null>(null);
  const pinLayerRef = useRef<LayerGroup | null>(null);
  const predLayerRef = useRef<LayerGroup | null>(null);
  const trapLayerRef = useRef<LayerGroup | null>(null);
  const trapHeatRef = useRef<HeatLayer | null>(null);
  const caseLayerRef = useRef<LayerGroup | MarkerClusterGroup | null>(null);
  const caseIsClusterRef = useRef(false);
  const heatRef = useRef<HeatLayer | null>(null);
  const pulseTimerRef = useRef<number | null>(null);
  // Tracks whether we've already auto-fit the map for the current view, so background
  // data polls don't keep snapping the camera back over the user's manual pan/zoom.
  const didAutoFitRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(13); // Local map zoom level state

  // Cache to store boundary polygons and attributes retrieved from the Survey Department MapServer
  // Format: { [zone_id]: { [layerId]: BoundaryInfo } }
  const [boundaryCache, setBoundaryCache] = useState<Record<string, Record<number, BoundaryInfo>>>({});

  // Store slices the map reacts to.
  const view = useStore((s) => s.view);
  const dashLayout = useStore((s) => s.dashLayout);
  const layers = useStore((s) => s.layers);
  const reports = useStore((s) => s.reports);
  const orders = useStore((s) => s.orders);
  const incidents = useStore((s) => s.incidents);
  const traps = useStore((s) => s.traps);
  const trapView = useStore((s) => s.trapView);
  const cases = useStore((s) => s.cases);
  const caseView = useStore((s) => s.caseView);
  const dateFrom = useStore((s) => s.dateFrom);
  const dateTo = useStore((s) => s.dateTo);
  const selectZone = useStore((s) => s.selectZone);
  const selectPrediction = useStore((s) => s.selectPrediction);
  const selectIncident = useStore((s) => s.selectIncident);
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
    try {
      map.createPane('trapPane');
      const pane = map.getPane('trapPane');
      if (pane) pane.style.zIndex = '450';
    } catch { /* ignore */ }
    trapLayerRef.current = L.layerGroup().addTo(map);
    caseLayerRef.current = null;
    caseIsClusterRef.current = false;

    // bridge for the "View zone reports" link inside trap popups
    (window as unknown as { __dgViewZoneReports?: () => void }).__dgViewZoneReports = () => {
      map.closePopup();
      useStore.getState().setView('reports');
    };

    setReady(true);

    // Zoom listener to trigger state-based styling recomputes
    const onZoom = () => {
      setZoom(map.getZoom());
    };
    map.on('zoomend', onZoom);

    const t = window.setTimeout(() => map.invalidateSize(), 120);
    return () => {
      window.clearTimeout(t);
      if (pulseTimerRef.current) {
        clearInterval(pulseTimerRef.current);
        pulseTimerRef.current = null;
      }
      delete (window as unknown as { __dgViewZoneReports?: () => void }).__dgViewZoneReports;
      map.off('zoomend', onZoom);
      map.remove();
      mapRef.current = null;
      caseLayerRef.current = null;
      heatRef.current = null;
      trapHeatRef.current = null;
      setReady(false);
    };
  }, []);

  // ---- Fetch Real Boundary Geometries from NSDI MapServer ----
  useEffect(() => {
    if (!ready || zones.length === 0) return;

    const loadBoundaries = async () => {
      const cache: Record<string, Record<number, BoundaryInfo>> = {};

      for (const z of zones) {
        const lat = z.c[0][0];
        const lng = z.c[0][1];
        cache[z.zone_id] = {};

        // Fetch GN Division boundary (Layer 1)
        const gnGeom = await fetchBoundaryGeometry(lat, lng, 1);
        if (gnGeom) cache[z.zone_id][1] = gnGeom;

        // Fetch District boundary (Layer 3)
        const distGeom = await fetchBoundaryGeometry(lat, lng, 3);
        if (distGeom) cache[z.zone_id][3] = distGeom;

        // Fetch Province boundary (Layer 4)
        const provGeom = await fetchBoundaryGeometry(lat, lng, 4);
        if (provGeom) cache[z.zone_id][4] = provGeom;
      }

      setBoundaryCache(cache);
    };

    loadBoundaries();
  }, [ready, zones]);

  // ---- zones ----
  useEffect(() => {
    const g = zoneLayerRef.current;
    if (!ready || !g) return;
    g.clearLayers();
    if (!layers.zones) return;

    zones.forEach((z) => {
      let coords: [number, number][][] | [number, number][] = z.c;
      let isFallback = true;
      let cachedInfo: BoundaryInfo | null = null;

      // If single-point fallback coordinate, expand into a 4-point bounding box polygon
      if (coords.length === 1 || (coords.length > 0 && !Array.isArray(coords[0][0]))) {
        const p = Array.isArray(coords[0]) && typeof coords[0][0] === 'number' ? (coords[0] as unknown as [number, number]) : [6.9271, 79.8612] as [number, number];
        const lat = p[0], lng = p[1];
        coords = [
          [lat + 0.006, lng - 0.006],
          [lat + 0.006, lng + 0.006],
          [lat - 0.006, lng + 0.006],
          [lat - 0.006, lng - 0.006],
        ];
      }

      // Select active layer ID based on current zoom level
      const activeLayerId = zoom <= 10 ? 4 : zoom <= 13 ? 3 : 1;
      const cached = boundaryCache[z.zone_id]?.[activeLayerId];
      if (cached) {
        coords = cached.coords;
        cachedInfo = cached;
        isFallback = false;
      }

      // Calculate active cases inside the boundary geometry
      const caseCount = cases.filter((c) => {
        if (!isFallback) {
          // Check containment inside outer ring of dynamic boundary
          return isPointInPolygon([c.lat, c.lng], (coords as [number, number][][])[0]);
        }
        return isPointInPolygon([c.lat, c.lng], z.c);
      }).length;

      const style = getZoneStyle(zoom, z.risk_level, z.risk_score);

      const poly = L.polygon(coords as any, {
        color: style.color,
        weight: style.weight,
        fillColor: style.fillColor,
        fillOpacity: z.risk_score > 0 || z.active_report_count > 0 ? style.fillOpacity : 0.1,
      }).addTo(g);

      poly.on('click', () => {
        selectZone({
          ...z,
          meta_name: cachedInfo?.name || z.name,
          meta_district: cachedInfo?.district || 'Colombo',
          meta_province: cachedInfo?.province || 'Western',
          // Pass the outer ring coordinates as the zone's coordinates so spatial checks match it
          c: cachedInfo?.coords ? (cachedInfo.coords[0] as any) : z.c,
        });
      });
      poly.bindTooltip(
        `${cachedInfo?.name || z.name} · Risk: ${(z.risk_level || 'low').toUpperCase()} (${z.risk_score}/100) · ${z.active_report_count} active reports`,
        { sticky: true, direction: 'top' }
      );
    });
  }, [ready, layers.zones, zones, cases, zoom, boundaryCache, selectZone]);

  // ---- pins: incidents (dashboard/reports) or work orders ----
  useEffect(() => {
    const g = pinLayerRef.current;
    if (!ready || !g) return;
    g.clearLayers();
    if (view === 'workorders') {
      orders.forEach((o) => {
        const col = RISK[o.risk_level].c;
        const icon = L.divIcon({
          className: '',
          html: `<div class="dg-leaf-pin" style="width:14px;height:14px;background:${col}"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        L.marker([o.lat, o.lng], { icon }).addTo(g).on('click', () => setActiveOrder(o as WorkOrder));
      });
      return;
    }
    // Show incident pins on dashboard/reports views
    if (layers.community === false) {
      // fallback: show individual report pins
      reports.forEach((r) => {
        const col = RISK[r.risk_level].c;
        const icon = L.divIcon({
          className: '',
          html: `<div class="dg-leaf-pin" style="width:14px;height:14px;background:${col}"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        L.marker([r.lat, r.lng], { icon }).addTo(g).on('click', () => setActiveReport(r as Report));
      });
      return;
    }
    // Show incident pins with confirmation badge
    incidents.forEach((inc) => {
      const col = RISK[inc.risk_level].c;
      const op = inc.status === 'resolved' ? 0.5 : inc.status === 'closed' ? 0.3 : 1;
      const badge =
        inc.confirmation_count > 1
          ? `<span style="position:absolute;top:-6px;right:-6px;min-width:15px;height:15px;padding:0 3px;border-radius:8px;background:#0f2d27;color:#fff;font-size:9.5px;font-weight:700;display:flex;align-items:center;justify-content:center;border:1.5px solid #fff;box-sizing:border-box">${inc.confirmation_count}</span>`
          : '';
      const html = `<div style="position:relative;width:16px;height:16px;opacity:${op}"><div style="width:16px;height:16px;border-radius:50%;border:2.5px solid #fff;background:${col};box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>${badge}</div>`;
      const icon = L.divIcon({ className: '', html, iconSize: [16, 16], iconAnchor: [8, 8] });
      L.marker([inc.lat, inc.lng], { icon }).addTo(g).on('click', () => selectIncident(inc));
    });

    // Auto-fit map view bounds to reported incidents/reports — but only once per view.
    // Background 9s polls replace `reports`/`incidents` and re-run this effect; without
    // the guard, fitBounds would reset the camera each cycle and discard the user's
    // manual pan/zoom.
    const map = mapRef.current;
    if (map && !didAutoFitRef.current) {
      const activePts: [number, number][] = [];
      incidents.forEach((i) => activePts.push([i.lat, i.lng]));
      reports.forEach((r) => { if (r.lat != null && r.lng != null) activePts.push([r.lat, r.lng]); });
      if (activePts.length > 0) {
        try {
          const bounds = L.latLngBounds(activePts);
          map.fitBounds(bounds, { maxZoom: 14, padding: [50, 50] });
          didAutoFitRef.current = true; // don't re-fit on later polls
        } catch {}
      }
    }
  }, [ready, layers.community, view, incidents, reports, orders, selectIncident, setActiveOrder, setActiveReport]);

  // Re-enable auto-fit when the user switches views, so each view re-frames its data
  // once (then stays put across background polls).
  useEffect(() => {
    didAutoFitRef.current = false;
  }, [view]);

  // ---- outbreak-forecast bands (dynamic per zone risk level) ----
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

    // Filter active risk zones
    const activeRiskZones = zones.filter((z) => z.risk_score >= 40 || z.risk_level === 'high' || z.risk_level === 'critical');
    activeRiskZones.forEach((z) => {
      const isCritical = z.risk_level === 'critical' || z.risk_score >= 80;
      const poly = L.polygon(z.c as any, {
        color: isCritical ? '#DC2626' : '#F59E0B',
        weight: isCritical ? 2.5 : 1.5,
        fillColor: isCritical ? '#DC2626' : '#F59E0B',
        fillOpacity: 0.3,
        dashArray: isCritical ? '6 4' : undefined,
      }).addTo(g);
      poly.bindTooltip(z.name + ' · Outbreak Risk: ' + (z.risk_level || 'high').toUpperCase() + ' (' + z.risk_score + '/100)', {
        sticky: true,
        direction: 'top',
      });
      if (isCritical) pulsers.push(poly);
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
  }, [ready, layers.forecast, zones]);

  // ---- IoT traps (hex markers / heatmap) ----
  useEffect(() => {
    const map = mapRef.current;
    const g = trapLayerRef.current;
    if (!ready || !map || !g) return;
    g.clearLayers();
    if (trapHeatRef.current) {
      map.removeLayer(trapHeatRef.current);
      trapHeatRef.current = null;
    }
    if (!layers.traps) return;
    if (trapView === 'heatmap' && typeof L.heatLayer === 'function') {
      const mx = Math.max(1, ...traps.map((t) => t.readings.mosquito_count_24h));
      const pts = traps.map((t) => [t.lat, t.lng, t.readings.mosquito_count_24h / mx] as [number, number, number]);
      trapHeatRef.current = L.heatLayer(pts, {
        radius: 25,
        blur: 20,
        maxZoom: 13,
        gradient: { 0.2: '#2563EB', 0.4: '#60A5FA', 0.6: '#F59E0B', 0.8: '#FB923C', 1.0: '#DC2626' },
      }).addTo(map);
      return;
    }
    traps.forEach((t) => {
      const col = TRAP_STATUS[t.status].c;
      const low = t.battery_percent < 20;
      const hex = `<svg width="20" height="20" viewBox="0 0 20 20" style="display:block;filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))"><polygon points="10,1.5 17.5,5.75 17.5,14.25 10,18.5 2.5,14.25 2.5,5.75" fill="${col}" stroke="#fff" stroke-width="1.6"/></svg>`;
      const dot = low
        ? `<span style="position:absolute;top:-2px;right:-2px;width:8px;height:8px;border-radius:50%;background:#DC2626;border:1.5px solid #fff"></span>`
        : '';
      const icon = L.divIcon({
        className: '',
        html: `<div style="position:relative;width:20px;height:20px">${hex}${dot}</div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      const m = L.marker([t.lat, t.lng], { icon, pane: 'trapPane' });
      m.bindPopup(trapPopupHTML(t), { maxWidth: 250, minWidth: 230 });
      g.addLayer(m);
    });
  }, [ready, layers.traps, trapView, traps]);

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
  }, [ready, view, dashLayout]);

  // Get active tier details for the legend overlay
  const getActiveTier = () => {
    const rungs = [
      { label: '0-2 cases (Low)', color: '#10B981' },
      { label: '3-5 cases (Medium)', color: '#EAB308' },
      { label: '6-10 cases (High)', color: '#F97316' },
      { label: '> 10 cases (Critical)', color: '#EF4444' },
    ];

    if (zoom <= 10) {
      return {
        name: 'Province Level',
        desc: 'Broad regional distribution',
        color: '#EF4444',
        rungs,
      };
    }
    if (zoom <= 13) {
      return {
        name: 'District Level',
        desc: 'Sub-district outbreak clusters',
        color: '#F97316',
        rungs,
      };
    }
    return {
      name: 'Grama Niladhari Level',
      desc: 'High-resolution local targeting',
      color: '#10B981',
      rungs,
    };
  };

  const tier = getActiveTier();

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Incident popup */}
      <IncidentPopup />

      {/* Floating Legend Panel - Syncs dynamically with active zoom tier in bottom-right */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          right: 24,
          zIndex: 1000,
          background: '#12211f',
          color: '#eef6f4',
          borderRadius: 12,
          padding: '10px 14px',
          width: 250,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          fontFamily: 'Inter, system-ui, sans-serif',
          backdropFilter: 'blur(8px)',
          pointerEvents: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: tier.color,
                boxShadow: `0 0 0 2px ${tier.color}33`,
              }}
            />
            <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.2px' }}>{tier.name}</span>
          </div>
          <span style={{ fontSize: 9.5, color: '#9fb3af' }}>Zoom: {zoom}</span>
        </div>

        {/* Linear color scale bar */}
        <div style={{ display: 'flex', alignItems: 'stretch', height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
          {tier.rungs.map((r, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                background: r.color,
                marginRight: i === tier.rungs.length - 1 ? 0 : 1,
              }}
            />
          ))}
        </div>

        {/* Labels under scale bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#9fb3af' }}>
          <span>0-2 (Low)</span>
          <span>3-5 (Med)</span>
          <span>6-10 (High)</span>
          <span>&gt;10 (Crit)</span>
        </div>
      </div>
    </div>
  );
}
