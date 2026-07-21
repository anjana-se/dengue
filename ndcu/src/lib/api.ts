import type { Report, WorkOrder, Zone, SourceType, ReportStatus, WorkOrderStatus, StaffUser, CurrentUser, DengueCase, Trap, Incident, IncidentDetail, IncidentReport, Decision, LarvaeVisible } from '../types';

const API_BASE = (import.meta.env && import.meta.env.VITE_API_URL) || 'http://localhost:3000/api/v1';

interface TokenPair {
  access_token: string;
  refresh_token: string;
}

// Legacy hardcoded zone coords removed — zones are now dynamic with real NSDI geometry
const ZONE_COORDS: Record<string, [number, number][]> = {};

// Normalise the AI larvae_visible signal (now 'yes'|'no'|'unclear'; older rows may
// be boolean or absent) into the LarvaeVisible enum used across the UI.
const normalizeLarvae = (v: unknown): LarvaeVisible => {
  if (v === 'yes' || v === 'no' || v === 'unclear') return v;
  if (typeof v === 'boolean') return v ? 'yes' : 'no';
  return 'unclear';
};

const getLocal = (key: string): string | null => {
  try { return localStorage.getItem(key); } catch { return null; }
};
const setLocal = (key: string, val: string): void => {
  try { localStorage.setItem(key, val); } catch {}
};
const removeLocal = (key: string): void => {
  try { localStorage.removeItem(key); } catch {}
};

export const api = {
  getAccessToken(): string | null { return getLocal('dg_access_token'); },
  getRefreshToken(): string | null { return getLocal('dg_refresh_token'); },

  getUser(): CurrentUser | null {
    const raw = getLocal('dg_user');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },

  setAuth(tokens: TokenPair, user: CurrentUser) {
    setLocal('dg_access_token', tokens.access_token);
    setLocal('dg_refresh_token', tokens.refresh_token);
    setLocal('dg_user', JSON.stringify(user));
  },

  logout() {
    removeLocal('dg_access_token');
    removeLocal('dg_refresh_token');
    removeLocal('dg_user');
  },

  isAuthenticated(): boolean { return !!this.getAccessToken(); },

  async request(url: string, options: RequestInit = {}): Promise<any> {
    const headers = new Headers(options.headers || {});
    const token = this.getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    options.headers = headers;

    let res = await fetch(`${API_BASE}${url}`, options);

    if (res.status === 401 && this.getRefreshToken()) {
      try {
        const refreshed = await this.refreshTokens();
        if (refreshed) {
          headers.set('Authorization', `Bearer ${this.getAccessToken()}`);
          res = await fetch(`${API_BASE}${url}`, options);
        }
      } catch {
        this.logout();
        throw { status: 401, message: 'Session expired. Please log in again.' };
      }
    }

    if (!res.ok) {
      let errorData: any;
      try { errorData = await res.json(); } catch { errorData = {}; }
      throw {
        status: res.status,
        message: errorData?.error?.message || errorData?.message || 'Request failed',
        code: errorData?.error?.code || errorData?.code,
      };
    }
    return res.json();
  },

  async refreshTokens(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) { this.logout(); return false; }
      const payload = await res.json();
      if (payload.success && payload.data?.access_token) {
        setLocal('dg_access_token', payload.data.access_token);
        if (payload.data.refresh_token) setLocal('dg_refresh_token', payload.data.refresh_token);
        return true;
      }
      return false;
    } catch { return false; }
  },

  async login(email: string, password: string): Promise<CurrentUser> {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const { access_token, refresh_token, user } = res.data;
    this.setAuth({ access_token, refresh_token }, user);
    return user as CurrentUser;
  },

  async getMe(): Promise<CurrentUser> {
    const res = await this.request('/auth/me');
    return res.data.user as CurrentUser;
  },

  // ── Zones ──────────────────────────────────────────────────────────────
  async getZones(activeOnly = false): Promise<Zone[]> {
    const qs = activeOnly ? '?active_only=true' : '';
    const res = await this.request(`/zones${qs}`);
    const raw = res.data || [];
    return raw.map((z: any) => {
      let coords: [number, number][] = [];

      // 1. Parse real GeoJSON geometry from PostGIS backend
      if (z.geom_json) {
        try {
          const parsed = JSON.parse(z.geom_json);
          if (parsed.type === 'MultiPolygon' && parsed.coordinates?.[0]?.[0]) {
            coords = parsed.coordinates[0][0].map((pt: [number, number]) => [Number(pt[1]), Number(pt[0])]);
          } else if (parsed.type === 'Polygon' && parsed.coordinates?.[0]) {
            coords = parsed.coordinates[0].map((pt: [number, number]) => [Number(pt[1]), Number(pt[0])]);
          }
        } catch (e) {
          console.warn('Failed to parse zone geom_json', e);
        }
      }

      // 2. Fall back to centroid lat/lng
      if ((!coords || coords.length === 0) && z.lat != null && z.lng != null) {
        const lat = Number(z.lat);
        const lng = Number(z.lng);
        coords = [
          [lat + 0.005, lng - 0.005],
          [lat + 0.005, lng + 0.005],
          [lat - 0.005, lng + 0.005],
          [lat - 0.005, lng - 0.005],
        ];
      }

      // 3. Fall back to hardcoded map or Colombo default
      if (!coords || coords.length === 0) {
        coords = ZONE_COORDS[z.id] || [[6.9271, 79.8612]];
      }

      return {
        zone_id: z.id,
        name: z.name,
        district: z.district,
        province: z.province,
        risk_score: Number(z.risk_score || 0),
        risk_level: z.risk_level || 'low',
        active_report_count: Number(z.active_report_count || 0),
        open_orders: 0,
        c: coords,
      };
    });
  },

  // ── Reports ────────────────────────────────────────────────────────────
  async getReports(zoneId?: string): Promise<Report[]> {
    const qs = zoneId ? `?zone_id=${zoneId}&limit=100` : '?limit=100';
    const res = await this.request(`/reports${qs}`);
    const rawReports: any[] = res.data?.data || res.data || [];

    const zonesRes = await this.getZones();
    const zoneMap = new Map(zonesRes.map((z: Zone) => [z.zone_id, z.name]));

    return rawReports.map((r: any) => {
      const ai = typeof r.ai_analysis === 'string'
        ? (() => { try { return JSON.parse(r.ai_analysis); } catch { return {}; } })()
        : (r.ai_analysis || {});
      const riskLevel = ((r.risk_level || 'low') as string).toLowerCase() as any;
      const statusRaw = r.status || '';
      return {
        report_id: r.id,
        report_no: r.report_no,
        source_type: (r.source_type || 'community') as SourceType,
        lat: r.latitude != null ? Number(r.latitude) : 0,
        lng: r.longitude != null ? Number(r.longitude) : 0,
        description: r.notes || '',
        status: (statusRaw === 'pending' || statusRaw === 'processing') ? 'processing' : 'analysed' as ReportStatus,
        risk_level: riskLevel,
        confidence: Math.round(Number(r.confidence_score ?? 0.5) * 100),
        needs_human_review: statusRaw === 'needs_human_review',
        remediation_action: r.remediation_action || 'Apply Larvicide',
        site_type: r.site_type || 'Stagnant Water',
        larvae_visible: normalizeLarvae(ai.larvae_visible),
        guidance_text: r.guidance_text || 'Perform standard vector inspection.',
        ai_analysis: {
          water_present: !!ai.water_present,
          site_type: r.site_type || 'Container',
          larvae_visible: normalizeLarvae(ai.larvae_visible),
          reasoning: ai.reasoning || '',
        },
        zone_id: r.zone_id || '',
        zone_name: zoneMap.get(r.zone_id || '') || r.location_name || 'Unknown Zone',
        created_at: r.created_at || new Date().toISOString(),
      };
    });
  },

  async reviewReport(reportId: string, notes: string): Promise<void> {
    await this.request(`/reports/${reportId}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ notes, outcome: 'confirmed' }),
    });
  },

  // ── Work Orders ────────────────────────────────────────────────────────
  async getWorkOrders(assignedTo?: string): Promise<any[]> {
    const qs = assignedTo ? `?assigned_to=${assignedTo}&limit=100` : '?limit=100';
    const res = await this.request(`/workorders${qs}`);
    return res.data?.data || res.data || [];
  },

  async createWorkOrder(reportId: string, priorityScore: number, remediationAction: string, notes?: string): Promise<any> {
    const res = await this.request('/workorders', {
      method: 'POST',
      body: JSON.stringify({ report_id: reportId, priority_score: priorityScore, remediation_action: remediationAction, notes }),
    });
    return res.data;
  },

  async assignWorkOrder(woId: string, phiId: string): Promise<any> {
    const res = await this.request(`/workorders/${woId}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ assigned_to: phiId }),
    });
    return res.data;
  },

  async resolveWorkOrder(woId: string, resolutionNotes: string, verifiedRiskLevel?: string, photoFile?: File): Promise<any> {
    let body: any;
    const headers: Record<string, string> = {};
    if (photoFile) {
      const formData = new FormData();
      formData.append('resolution_notes', resolutionNotes);
      if (verifiedRiskLevel) formData.append('verified_risk_level', verifiedRiskLevel);
      formData.append('file', photoFile);
      body = formData;
    } else {
      body = JSON.stringify({ resolution_notes: resolutionNotes, verified_risk_level: verifiedRiskLevel });
      headers['Content-Type'] = 'application/json';
    }
    const res = await this.request(`/workorders/${woId}/resolve`, { method: 'PATCH', headers, body });
    return res.data;
  },

  async acceptWorkOrder(woId: string): Promise<any> {
    const res = await this.request(`/workorders/${woId}/accept`, {
      method: 'PATCH',
      body: JSON.stringify({}),
    });
    return res.data;
  },

  // ── Drone ──────────────────────────────────────────────────────────────
  async getDroneMissions(): Promise<any[]> {
    const res = await this.request('/drone/missions?limit=50');
    return res.data?.data || res.data || [];
  },

  async createDroneMission(name: string, zoneId?: string): Promise<any> {
    const res = await this.request('/drone/missions', {
      method: 'POST',
      body: JSON.stringify({ name, zone_id: zoneId }),
    });
    return res.data;
  },

  async uploadDroneFrame(missionId: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await this.request(`/drone/missions/${missionId}/frames`, { method: 'POST', body: formData });
    return res.data;
  },

  // ── Chat ───────────────────────────────────────────────────────────────
  async sendChatMessage(message: string, sessionId?: string): Promise<{ reply: string; session_id: string }> {
    const res = await this.request('/chat/message', {
      method: 'POST',
      body: JSON.stringify({ message, session_id: sessionId }),
    });
    return res.data;
  },

  // ── Dashboard ─────────────────────────────────────────────────────────
  async getDashboardSummary(): Promise<any> {
    const res = await this.request('/dashboard/summary');
    return res.data;
  },

  async exportCsv(): Promise<void> {
    const token = this.getAccessToken();
    const res = await fetch(`${API_BASE}/dashboard/export`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw { message: 'Failed to export CSV' };
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dengue-reports-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // ── User Management (NDCU Admin only) ─────────────────────────────────
  async listStaffUsers(): Promise<StaffUser[]> {
    const res = await this.request('/auth/staff');
    return res.data || [];
  },

  async registerStaff(data: { email: string; password: string; full_name: string; role: string; language_preference?: string }): Promise<StaffUser> {
    const res = await this.request('/auth/staff/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data.user;
  },

  async updateStaff(userId: string, data: { full_name?: string; email?: string; role?: string; password?: string; is_active?: boolean }): Promise<StaffUser> {
    const res = await this.request(`/auth/staff/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return res.data.user;
  },

  // ── Cases ──────────────────────────────────────────────────────────────
  async getCases(filters?: { zone_id?: string; severity?: string }): Promise<DengueCase[]> {
    const params = new URLSearchParams();
    if (filters?.zone_id) params.set('zone_id', filters.zone_id);
    if (filters?.severity) params.set('severity', filters.severity);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await this.request(`/cases${qs}`);
    return res.data || [];
  },

  // ── IoT Traps ─────────────────────────────────────────────────────────
  async getTraps(zoneId?: string): Promise<Trap[]> {
    const qs = zoneId ? `?zone_id=${zoneId}` : '';
    const res = await this.request(`/traps${qs}`);
    return res.data || [];
  },

  // ── Incidents ─────────────────────────────────────────────────────────
  async getIncidents(): Promise<Incident[]> {
    const res = await this.request('/incidents');
    const raw = res.data || [];
    return raw.map((i: any) => ({
      incident_id: i.id,
      code: i.code,
      status: i.status,
      risk_level: i.risk_level,
      lat: i.latitude,
      lng: i.longitude,
      zone_id: i.zone_id,
      zone_name: i.zone_name,
      confirmation_count: i.confirmation_count,
      report_count: i.report_count,
      primary_report_id: i.primary_report_id,
      created_at: i.created_at,
      verified_at: i.verified_at,
      resolved_at: i.resolved_at,
      site_type: i.site_type,
    }));
  },

  async getIncidentDetail(id: string): Promise<IncidentDetail> {
    const res = await this.request(`/incidents/${id}`);
    const d = res.data || {};
    const inc: Incident = d.inc;
    // Map the backend's real report rows into the IncidentReport shape.
    // larvae_visible / water_present come straight from the stored AI analysis
    // (no risk-level derivation), and confidence is scaled to a 0-100 percentage.
    const reports: IncidentReport[] = (d.reports || []).map((r: any) => ({
      report_id: r.report_id,
      report_no: r.report_no,
      role: r.source_type === 'drone' ? 'Drone operator' : 'Community reporter',
      source_type: (r.source_type || 'community') as SourceType,
      submitted_at: r.submitted_at || new Date().toISOString(),
      risk_level: ((r.risk_level || 'low') as string).toLowerCase() as any,
      confidence: Math.round(Number(r.confidence_score ?? 0.5) * 100),
      primary: !!r.primary,
      site_type: r.site_type || inc?.site_type || 'other',
      lat: r.lat != null ? Number(r.lat) : (inc?.lat ?? 0),
      lng: r.lng != null ? Number(r.lng) : (inc?.lng ?? 0),
      zone_name: r.location_name || inc?.zone_name || 'Unknown Zone',
      incident_id: id,
      larvae_visible: normalizeLarvae(r.larvae_visible),
      water_present: !!r.water_present,
      notes: r.notes || '',
    }));
    const decisions: Decision[] = d.decisions || [];
    return { inc, reports, decisions };
  },

  async getDuplicateDecisions(): Promise<Decision[]> {
    const res = await this.request('/incidents/decisions');
    const raw = res.data || [];
    return raw.map((d: any) => ({
      decision_id: d.id,
      new_report_id: d.new_report_id,
      new_report_no: d.new_report_no,
      matched_incident_id: d.matched_incident_id,
      confidence: d.confidence,
      decision: d.decision,
      status: d.status,
      ai_reasoning: d.ai_reasoning,
      reviewed_by: d.reviewed_by,
      override_reason: d.override_reason,
      created_at: d.created_at,
      reviewed_at: d.reviewed_at,
      gps_distance_m: d.gps_distance_m,
      time_diff_h: d.time_diff_h,
      new_lat: d.new_lat,
      new_lng: d.new_lng,
    }));
  },

  async resolveDuplicateDecision(
    decisionId: string,
    action: 'merge' | 'separate' | 'new_incident',
    notes?: string
  ): Promise<any> {
    const res = await this.request(`/incidents/decisions/${decisionId}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({ action, notes }),
    });
    return res.data;
  },

  async updateIncidentStatus(id: string, status: string): Promise<any> {
    const res = await this.request(`/incidents/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return res.data;
  },
};

