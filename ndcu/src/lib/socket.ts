import { io, type Socket } from 'socket.io-client';
import { api } from './api';
import { useStore } from '../store/useStore';
import type { Zone } from '../types';

/**
 * lib/socket.ts — realtime push updates for the NDCU portal.
 *
 * Replaces the old 9s polling loop. Connects to the backend Socket.IO server
 * (JWT-authenticated over the same origin as the REST API) and applies each
 * server event incrementally to the Zustand store, so the UI only updates when
 * something actually changes on the backend.
 *
 * Events consumed (admin room): report:analysed, workorder:created,
 * zone:updated, incident:updated. Payloads are thin (ids + a few scalars); we
 * hydrate the changed entity via the REST client, except zone:updated whose
 * payload already carries the full new score.
 */

const API_URL = (import.meta.env && import.meta.env.VITE_API_URL) || 'http://localhost:3000/api/v1';

// Socket.IO connects to the server ORIGIN (not the /api/v1 REST base). Resolve
// relative VITE_API_URL values against the current page origin.
function socketOrigin(): string | undefined {
  try {
    return new URL(API_URL, window.location.origin).origin;
  } catch {
    return undefined;
  }
}

let socket: Socket | null = null;
let connectedOnce = false;

// Thin server payload shapes.
interface ReportAnalysedPayload { report_id: string; zone_id: string | null; risk_level: string | null; status: string }
interface WorkOrderCreatedPayload { workorder_id: string; report_id: string; zone_id: string | null; priority_score: number }
interface ZoneUpdatedPayload { zone_id: string; risk_level: string; risk_score: number; active_report_count: number }
interface IncidentUpdatedPayload { incident_id: string }

export function connectSocket(): void {
  if (socket) return; // already connected / connecting

  socket = io(socketOrigin(), {
    path: '/socket.io',
    // Callback form so the freshest token is sent on every (re)connect,
    // e.g. after a 401→refresh rotates the access token.
    auth: (cb) => cb({ token: api.getAccessToken() || '' }),
    transports: ['websocket', 'polling'],
  });

  // On reconnect, reconcile any events missed while offline with one full fetch.
  // The first connect is skipped — login/checkSavedAuth already fetched.
  socket.on('connect', () => {
    if (connectedOnce) {
      useStore.getState().fetchData().catch(() => {});
    }
    connectedOnce = true;
  });

  socket.on('connect_error', (err) => {
    // Don't spam the user; a dropped socket degrades gracefully to the last fetch.
    console.warn('[socket] connect_error:', err.message);
  });

  // ── report:analysed → hydrate the single report and upsert it ──
  socket.on('report:analysed', async (p: ReportAnalysedPayload) => {
    try {
      const zoneMap = new Map(useStore.getState().zones.map((z: Zone) => [z.zone_id, z.name]));
      const report = await api.getReport(p.report_id, zoneMap);
      useStore.getState().upsertReport(report);
      if (report.risk_level === 'high' || report.risk_level === 'critical') {
        useStore.getState().toast(`New ${report.risk_level} report in ${report.zone_name}`, 'info');
      }
    } catch (e) {
      console.warn('[socket] report:analysed hydrate failed', e);
    }
  });

  // ── workorder:created → hydrate the raw WO row; store maps it ──
  socket.on('workorder:created', async (p: WorkOrderCreatedPayload) => {
    try {
      const raw = await api.getWorkOrder(p.workorder_id);
      useStore.getState().upsertWorkOrder(raw);
      useStore.getState().toast('New work order created', 'info');
    } catch (e) {
      console.warn('[socket] workorder:created hydrate failed', e);
    }
  });

  // ── zone:updated → payload is complete, no fetch needed ──
  socket.on('zone:updated', (p: ZoneUpdatedPayload) => {
    useStore.getState().patchZone(p);
  });

  // ── incident:updated → re-fetch the (small) incidents list, upsert the one ──
  socket.on('incident:updated', async (p: IncidentUpdatedPayload) => {
    try {
      const list = await api.getIncidents();
      const inc = list.find((x) => x.incident_id === p.incident_id);
      if (inc) useStore.getState().upsertIncident(inc);
    } catch (e) {
      console.warn('[socket] incident:updated refresh failed', e);
    }
  });
}

export function disconnectSocket(): void {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
  connectedOnce = false;
}

export function getSocket(): Socket | null {
  return socket;
}
