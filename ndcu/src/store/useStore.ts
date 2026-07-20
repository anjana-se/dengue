import { create } from 'zustand';
import type {
  CaseView,
  ChatMessage,
  DashLayout,
  Decision,
  DengueCase,
  Incident,
  IncidentReport,
  IncidentStatus,
  LayerKey,
  Layers,
  LoginTab,
  Mission,
  Phi,
  Prediction,
  Report,
  ReportFilter,
  Role,
  StaffUser,
  CurrentUser,
  Toast,
  ToastKind,
  Trap,
  TrapView,
  ViewKey,
  WorkOrder,
  WorkOrderStatus,
  Zone,
} from '../types';
import { INC_STATUS, RISK } from '../theme';
import { AGES, CASE_ZONES, HOSPITALS, SITES, ZONES } from '../data/zones';
import { mkCases, pick } from '../data/mock';
import { mkTraps } from '../data/traps';
import { uuid } from '../utils/uuid';
import { loadLS, saveLS } from '../utils/storage';
import { api } from '../lib/api';

const DEFAULT_LAYERS: Layers = {
  zones: true,
  community: true,
  drone: true,
  cases: false,
  forecast: false,
  traps: false,
};

function readPredAlertDismissed(): boolean {
  try { return sessionStorage.getItem('dg_predAlert') === '1'; } catch { return false; }
}

/** Which view to land on per role */
function viewForRole(role: Role): ViewKey {
  if (role === 'phi') return 'workorders';
  if (role === 'drone_operator') return 'drone';
  return 'dashboard';
}

/** Which views a role can access */
export function allowedViews(role: Role): ViewKey[] {
  if (role === 'drone_operator') return ['drone'];
  if (role === 'phi') return ['workorders', 'reports', 'chat'];
  // ndcu_admin
  return ['dashboard', 'reports', 'workorders', 'drone', 'chat', 'users'];
}

export interface AppState {
  // ── auth ──
  authed: boolean;
  role: Role;
  loginTab: LoginTab;
  view: ViewKey;
  currentUser: CurrentUser | null;
  loading: boolean; // global auth loading state
  dashLayout: DashLayout;

  // ── data ──
  reports: Report[];
  orders: WorkOrder[];
  cases: DengueCase[];
  missions: any[];
  zones: Zone[];
  staffUsers: StaffUser[];
  dashboardSummary: any | null;
  incidents: Incident[];
  decisions: Decision[];
  traps: Trap[];

  // ── selection / drawers ──
  activeReport: Report | null;
  activeOrder: WorkOrder | null;
  dispatchOrder: WorkOrder | null;
  selZone: Zone | null;
  selPred: Prediction | null;
  selIncident: Incident | null;
  activeIncident: string | null;
  incReport: IncidentReport | null;
  mergeSource: string | null;
  mergeQuery: string;
  overrideDec: string | null;
  predPanel: boolean;

  // ── map controls ──
  layers: Layers;
  caseView: CaseView;
  trapView: TrapView;
  dateFrom: number;
  dateTo: number;
  legendOpen: boolean;

  // ── panels / filters ──
  reportFilter: ReportFilter;
  reportZone: string;
  reportSev: string;
  reportSite: string;
  dupReviewOpen: boolean | null;
  iotAlertOpen: boolean | null;

  // ── misc ──
  predAlertDismissed: boolean;
  toasts: Toast[];
  chat: ChatMessage[];
  chatSessionId?: string;
  liveOn: boolean;
  demoMode: boolean;

  // ── actions ──
  setLoginTab: (tab: LoginTab) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkSavedAuth: () => void;
  setView: (v: ViewKey) => void;
  setDashLayout: (m: DashLayout) => void;
  toggleLayer: (k: LayerKey) => void;
  enableForecastLayer: () => void;
  setCaseView: (v: CaseView) => void;
  setTrapView: (v: TrapView) => void;
  setDateRange: (from: number, to: number) => void;
  setLegendOpen: (open: boolean) => void;
  toggleLive: () => void;
  toggleDemo: () => void;
  toast: (t: string, kind: ToastKind) => void;
  liveTick: () => void;
  demoTickReport: () => void;
  demoTickZone: () => void;
  demoTickCase: () => void;
  demoTickDuplicate: () => void;
  demoTickIncident: () => void;

  // ── data ops ──
  fetchData: () => Promise<void>;
  fetchStaffUsers: () => Promise<void>;
  createWO: (r: Report) => Promise<void>;
  createWOFromIncident: (inc: Incident) => void;
  createWOFromTrap: (t: Trap, reason: string) => void;
  dispatch: (woId: string, phi: Phi | null, instr: string) => Promise<void>;
  resolveWO: (woId: string) => Promise<void>;
  acceptWO: (woId: string) => Promise<void>;
  sendChat: (txt: string) => Promise<void>;
  exportCsv: () => Promise<void>;
  registerStaff: (data: { email: string; password: string; full_name: string; role: string }) => Promise<void>;
  updateStaff: (userId: string, data: { full_name?: string; email?: string; role?: string; password?: string; is_active?: boolean }) => Promise<void>;

  // ── selections ──
  selectZone: (z: Zone | null) => void;
  selectPrediction: (p: Prediction | null) => void;
  selectIncident: (inc: Incident | null) => void;
  setActiveReport: (r: Report | null) => void;
  setActiveOrder: (o: WorkOrder | null) => void;
  setDispatchOrder: (o: WorkOrder | null) => void;
  dismissPredAlert: () => void;

  // ── predictions panel ──
  openPredictions: () => void;
  setPredPanel: (open: boolean) => void;
  showPredictionOnMap: (p: Prediction) => void;

  // ── incidents / duplicates ──
  setReportFilter: (f: ReportFilter) => void;
  setReportZone: (v: string) => void;
  setReportSev: (v: string) => void;
  setReportSite: (v: string) => void;
  setDupReviewOpen: (open: boolean) => void;
  setIotAlertOpen: (open: boolean) => void;
  setActiveIncident: (id: string | null) => void;
  setIncReport: (r: IncidentReport | null) => void;
  setIncidentStatus: (id: string, status: IncidentStatus) => void;
  updateDecision: (id: string, action: 'approve' | 'override', reason?: string | null) => void;
  setOverrideDec: (id: string | null) => void;
  setMergeSource: (id: string | null) => void;
  setMergeQuery: (q: string) => void;
  mergeIncidents: (srcId: string, tgtId: string) => void;
}

/** Map backend raw work order row + existing reports into WorkOrder frontend shape */
function mapWorkOrder(o: any, reportMap: Map<string, Report>, zoneMap: Map<string, string>): WorkOrder {
  const r = reportMap.get(o.report_id);
  const statusMapped: WorkOrderStatus =
    o.status === 'resolved' ? 'resolved' :
    o.status === 'accepted' ? 'in_progress' :
    o.assigned_to ? 'assigned' : 'new';

  return {
    wo_id: o.id,
    status: statusMapped,
    priority_score: o.priority_score,
    assigned_to: o.assigned_to
      ? { user_id: o.assigned_to, name: 'PHI Officer' }
      : null,
    lat: r?.lat ?? 6.9271,
    lng: r?.lng ?? 79.8612,
    zone_name: r?.zone_name ?? (zoneMap.get(o.zone_id || '') || 'Unknown Zone'),
    zone_id: r?.zone_id ?? o.zone_id ?? '',
    risk_level: r?.risk_level ?? 'low',
    confidence: r?.confidence ?? 0,
    site_type: r?.site_type ?? 'Stagnant Water',
    remediation_action: o.remediation_action || r?.remediation_action || 'Apply Larvicide',
    guidance_text: r?.guidance_text ?? 'Vector inspection.',
    larvae_visible: r?.larvae_visible ?? 'unclear',
    image_url: o.follow_up_image_url || null,
    description: r?.description || '',
    ndcu_instructions: o.notes || '',
    notes: o.resolution_notes || '',
    outcome: o.resolution_notes || null,
    created_at: o.created_at,
    resolved_at: o.resolved_at || undefined,
  };
}

export const useStore = create<AppState>((set, get) => ({
  authed: false,
  role: 'ndcu_admin',
  loginTab: 'email',
  view: 'dashboard',
  currentUser: null,
  loading: false,
  dashLayout: loadLS<DashLayout>('dg_dashlayout', 'split'),

  reports: [],
  orders: [],
  cases: [],
  missions: [],
  zones: [],
  staffUsers: [],
  dashboardSummary: null,
  incidents: [],
  decisions: [],
  traps: [],

  activeReport: null,
  activeOrder: null,
  dispatchOrder: null,
  incReport: null,
  selZone: null,
  selPred: null,
  selIncident: null,
  activeIncident: null,
  mergeSource: null,
  mergeQuery: '',
  overrideDec: null,
  predPanel: false,

  layers: { ...DEFAULT_LAYERS, ...loadLS<Partial<Layers>>('dg_layers', {}) },
  caseView: loadLS<CaseView>('dg_caseview', 'cluster'),
  trapView: loadLS<TrapView>('dg_trapview', 'traps'),
  dateFrom: 30,
  dateTo: 0,
  legendOpen: true,

  reportFilter: 'all',
  reportZone: 'all',
  reportSev: 'all',
  reportSite: 'all',
  dupReviewOpen: null,
  iotAlertOpen: null,

  predAlertDismissed: readPredAlertDismissed(),
  toasts: [],
  chat: [
    {
      role: 'assistant',
      content: "Hello. I'm the DengueGuard assistant. Ask me about zone risk, work orders, or reporting guidance — in English, Sinhala, or Tamil.",
      lang: 'en',
    },
  ],
  liveOn: true,
  demoMode: false,

  // ── Actions ────────────────────────────────────────────────────────────
  setLoginTab: (loginTab) => set({ loginTab }),

  login: async (email, password) => {
    set({ loading: true });
    try {
      const user = await api.login(email, password);
      const role = user.role as Role;
      set({
        authed: true,
        role,
        currentUser: user,
        view: viewForRole(role),
        loading: false,
      });
      get().toast(`Welcome, ${user.full_name}`, 'success');
      await get().fetchData();
    } catch (err: any) {
      set({ loading: false });
      get().toast(err.message || 'Login failed. Check your credentials.', 'error');
      throw err;
    }
  },

  logout: () => {
    api.logout();
    set({
      authed: false,
      currentUser: null,
      role: 'ndcu_admin',
      reports: [],
      orders: [],
      missions: [],
      zones: [],
      staffUsers: [],
      dashboardSummary: null,
      chat: [{
        role: 'assistant',
        content: "Hello. I'm the DengueGuard assistant. Ask me about zone risk, work orders, or reporting guidance — in English, Sinhala, or Tamil.",
        lang: 'en',
      }],
      chatSessionId: undefined,
      activeReport: null,
      activeOrder: null,
      dispatchOrder: null,
      selIncident: null,
      activeIncident: null,
      mergeSource: null,
      mergeQuery: '',
      overrideDec: null,
      predPanel: false,
    });
    get().toast('Logged out successfully', 'info');
  },

  checkSavedAuth: () => {
    if (api.isAuthenticated()) {
      const user = api.getUser();
      if (user) {
        const role = user.role as Role;
        set({ authed: true, role, currentUser: user, view: viewForRole(role) });
        get().fetchData().catch(() => {});
      }
    }
  },

  fetchData: async () => {
    if (!get().authed) return;
    const role = get().role;
    try {
      // All roles fetch zones
      const zones = await api.getZones();
      const zoneMap = new Map(zones.map((z) => [z.zone_id, z.name]));

      if (role === 'drone_operator') {
        // Drone operator only needs missions
        const missions = await api.getDroneMissions();
        set({
          zones,
          missions: missions.map((m: any) => ({
            mission_id: m.id,
            mission_name: m.name,
            status: m.status === 'complete' ? 'complete' : m.status === 'in_progress' ? 'processing' : 'open',
            image_count: m.total_images || 0,
            processed_count: m.processed_images || 0,
            summary: m.summary || { critical: 0, high: 0, medium: 0, low: 0 },
          })),
        });
        return;
      }

      // PHI + NDCU Admin fetch reports and work orders
      const reports = await api.getReports();
      const rawOrders = await api.getWorkOrders();
      const reportMap = new Map(reports.map((r) => [r.report_id, r]));

      const orders: WorkOrder[] = rawOrders.map((o: any) =>
        mapWorkOrder(o, reportMap, zoneMap)
      );

      const openOrdersCount: Record<string, number> = {};
      orders.forEach((o) => {
        if (o.status !== 'resolved') {
          openOrdersCount[o.zone_id] = (openOrdersCount[o.zone_id] || 0) + 1;
        }
      });
      const updatedZones = zones.map((z) => ({
        ...z,
        open_orders: openOrdersCount[z.zone_id] || 0,
      }));

      let missions: any[] = [];
      let dashboardSummary: any = null;
      let cases: any[] = [];
      let traps: any[] = [];
      let incidents: any[] = [];
      let decisions: any[] = [];

      if (role === 'ndcu_admin') {
        [missions] = await Promise.all([api.getDroneMissions()]);
        try { dashboardSummary = await api.getDashboardSummary(); } catch {}
      }

      try {
        const [c, t, incs, decs] = await Promise.all([
          api.getCases(),
          api.getTraps(),
          api.getIncidents(),
          api.getDuplicateDecisions()
        ]);
        cases = c;
        traps = t;
        incidents = incs;
        decisions = decs;
      } catch (err: any) {
        console.error('Failed to fetch additional operational layers:', err);
      }

      set({
        zones: updatedZones,
        reports,
        orders,
        dashboardSummary,
        cases,
        traps,
        incidents,
        decisions,
        missions: missions.map((m: any) => ({
          mission_id: m.id,
          mission_name: m.name,
          status: m.status === 'complete' ? 'complete' : m.status === 'in_progress' ? 'processing' : 'open',
          image_count: m.total_images || 0,
          processed_count: m.processed_images || 0,
          summary: m.summary || { critical: 0, high: 0, medium: 0, low: 0 },
        })),
      });
    } catch (err: any) {
      get().toast(err.message || 'Failed to load data', 'error');
    }
  },

  fetchStaffUsers: async () => {
    try {
      const users = await api.listStaffUsers();
      set({ staffUsers: users });
    } catch (err: any) {
      get().toast(err.message || 'Failed to load staff users', 'error');
    }
  },

  setView: (v) => {
    const allowed = allowedViews(get().role);
    if (!allowed.includes(v)) return;
    set({ view: v, activeReport: null, activeOrder: null, incReport: null });
    // Fetch staff users when navigating to users panel
    if (v === 'users') get().fetchStaffUsers();
  },

  setDashLayout: (m) => {
    saveLS('dg_dashlayout', m);
    set({ dashLayout: m });
  },

  toggleLayer: (k) => set((s) => {
    const layers = { ...s.layers, [k]: !s.layers[k] };
    saveLS('dg_layers', layers);
    return { layers };
  }),

  enableForecastLayer: () => set((s) => {
    const layers = { ...s.layers, forecast: true };
    saveLS('dg_layers', layers);
    return { layers };
  }),

  setCaseView: (v) => { saveLS('dg_caseview', v); set({ caseView: v }); },
  setTrapView: (v) => { saveLS('dg_trapview', v); set({ trapView: v }); },
  setDateRange: (from, to) => set({ dateFrom: from, dateTo: to }),
  setLegendOpen: (legendOpen) => set({ legendOpen }),
  toggleLive: () => set((s) => ({ liveOn: !s.liveOn })),
  toggleDemo: () => {
    const on = !get().demoMode;
    set({ demoMode: on });
    get().toast(on ? 'Demo mode active — simulating live data' : 'Demo stopped', 'info');
  },

  toast: (t, kind) => {
    const id = Date.now() + Math.random();
    set((s) => ({ toasts: [...s.toasts, { id, t, kind }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 3800);
  },

  liveTick: async () => {
    const s = get();
    if (!s.authed || !s.liveOn) return;
    if (s.demoMode) return;
    await s.fetchData();
  },

  // ── Demo ticks ──
  demoTickReport: () => {
    const z = ZONES[Math.floor(Math.random() * 3)];
    const lv = Math.random() > 0.5 ? 'critical' : 'high';
    const r: Report = {
      report_id: 'R' + Math.floor(Math.random() * 9000 + 2000),
      source_type: 'community',
      lat: z.c[0][0] - Math.random() * 0.008,
      lng: z.c[0][1] + Math.random() * 0.012,
      description: '[Demo] high-risk community report',
      status: 'analysed',
      risk_level: lv,
      confidence: 78 + Math.floor(Math.random() * 20),
      needs_human_review: false,
      remediation_action: 'Source reduction + larvicide',
      site_type: SITES[Math.floor(Math.random() * SITES.length)],
      larvae_visible: 'yes',
      guidance_text: 'Empty and scrub the container. Apply larvicide.',
      ai_analysis: { water_present: true, site_type: 'Container', larvae_visible: 'yes', reasoning: 'Demo synthetic breeding site.' },
      zone_id: z.zone_id,
      zone_name: z.name,
      created_at: new Date().toISOString(),
      _new: true,
    };
    set((s) => ({ reports: [r, ...s.reports].slice(0, 60) }));
    get().toast('report:analysed — ' + RISK[lv].label + ' in ' + z.name, 'info');
  },

  demoTickZone: () => {
    const z = ZONES[Math.floor(Math.random() * ZONES.length)];
    get().toast('zone:updated — ' + z.name + ' risk ' + (z.risk_score + Math.floor(Math.random() * 6 - 2)), 'info');
  },

  demoTickCase: () => {
    const cz = CASE_ZONES[Math.floor(Math.random() * 4)];
    const sevR = Math.random();
    const severity = sevR < 0.4 ? 'mild' : sevR < 0.75 ? 'moderate' : 'severe';
    const c: DengueCase = {
      case_id: 'C-demo-' + Math.floor(Math.random() * 9999),
      lat: cz.lat + (Math.random() - 0.5) * 0.02,
      lng: cz.lng + (Math.random() - 0.5) * 0.02,
      district: cz.d,
      zone_name: cz.n,
      reported_date: new Date().toISOString(),
      age_group: pick(AGES),
      severity,
      hospital: pick(HOSPITALS),
      status: 'active',
    };
    set((s) => ({ cases: [c, ...s.cases] }));
  },

  demoTickDuplicate: () => {
    const s = get();
    const inc = s.incidents[Math.floor(Math.random() * Math.min(6, s.incidents.length))];
    const conf = 0.72 + Math.random() * 0.16;
    const pct = Math.round(conf * 100);
    const dist = 20 + Math.floor(Math.random() * 50);
    const dec: Decision = {
      decision_id: uuid(),
      new_report_id: 'R' + Math.floor(Math.random() * 9000 + 3000),
      matched_incident_id: inc.incident_id,
      confidence: conf,
      decision: 'flagged_review',
      status: 'pending',
      ai_reasoning: 'Possible duplicate of ' + inc.code + ' — GPS ' + dist + ' m away, moderate image similarity.',
      reviewed_by: null,
      override_reason: null,
      created_at: new Date().toISOString(),
      reviewed_at: null,
      gps_distance_m: dist,
      time_diff_h: 1 + Math.floor(Math.random() * 12),
      new_lat: inc.lat + 0.0005,
      new_lng: inc.lng + 0.0005,
    };
    set((st) => ({ decisions: [dec, ...st.decisions] }));
    if (s.role === 'ndcu_admin') get().toast('New duplicate flagged for review — confidence ' + pct + '%', 'info');
  },

  demoTickIncident: () => {
    const s = get();
    const inc = s.incidents[Math.floor(Math.random() * Math.min(6, s.incidents.length))];
    set((st) => ({
      incidents: st.incidents.map((x) =>
        x.incident_id === inc.incident_id
          ? { ...x, confirmation_count: x.confirmation_count + 1, report_count: x.report_count + 1 }
          : x,
      ),
    }));
    get().toast('incident:updated — ' + inc.code + ' now has ' + (inc.confirmation_count + 1) + ' reports', 'info');
  },

  createWO: async (r) => {
    try {
      await api.createWorkOrder(r.report_id, r.confidence, r.remediation_action, r.description);
      set({ activeReport: null });
      get().toast('Work order created', 'success');
      await get().fetchData();
    } catch (err: any) {
      get().toast(err.message || 'Failed to create work order', 'error');
    }
  },

  createWOFromIncident: (inc) => {
    const wo: WorkOrder = {
      wo_id: 'WO' + Math.floor(Math.random() * 900 + 300),
      status: 'new',
      priority_score:
        inc.risk_level === 'critical' ? 90 : inc.risk_level === 'high' ? 72 : inc.risk_level === 'medium' ? 50 : 32,
      assigned_to: null,
      lat: inc.lat,
      lng: inc.lng,
      zone_name: inc.zone_name,
      zone_id: inc.zone_id,
      risk_level: inc.risk_level,
      confidence: 85,
      site_type: inc.site_type,
      remediation_action: 'Source reduction',
      guidance_text:
        'Locate the flagged container and remove standing water. Apply larvicide and record before/after photos.',
      larvae_visible: (inc.risk_level === 'critical' || inc.risk_level === 'high') ? 'yes' : 'no',
      image_url: null,
      description: 'Incident ' + inc.code + ' — ' + inc.confirmation_count + ' confirming report(s) at ' + inc.zone_name + '.',
      incident_id: inc.incident_id,
      confirmation_count: inc.confirmation_count,
      ndcu_instructions: '',
      notes: '',
      outcome: null,
      created_at: new Date().toISOString(),
    };
    set((s) => ({ orders: [wo, ...s.orders], selIncident: null }));
    get().toast('Work order ' + wo.wo_id + ' created for ' + inc.code, 'success');
  },

  createWOFromTrap: (t, reason) => {
    const rl = t.readings.larvae_detected ? 'high' : 'medium';
    const wo: WorkOrder = {
      wo_id: 'WO' + Math.floor(Math.random() * 900 + 300),
      status: 'new',
      priority_score: Math.min(99, 60 + Math.round(t.readings.mosquito_count_24h / 2)),
      assigned_to: null,
      lat: t.lat,
      lng: t.lng,
      zone_name: t.zone_name,
      zone_id: t.zone_id,
      risk_level: rl,
      confidence: 88,
      site_type: 'IoT trap alert',
      remediation_action: 'Inspect trap site',
      guidance_text:
        'Inspect the area around trap ' + t.serial_number + '. Reason: ' + reason + '. Check for nearby breeding sources, remove standing water, and verify the trap hardware and battery.',
      larvae_visible: t.readings.larvae_detected ? 'yes' : 'no',
      image_url: null,
      description: 'Trap ' + t.serial_number + ' (' + t.zone_name + ') — ' + reason,
      ndcu_instructions: '',
      notes: '',
      outcome: null,
      created_at: new Date().toISOString(),
    };
    set((s) => ({ orders: [wo, ...s.orders], activeOrder: wo }));
    get().toast('Work order ' + wo.wo_id + ' created from ' + t.serial_number, 'success');
  },

  dispatch: async (woId, phi, _instr) => {
    if (!phi) { get().toast('Select a PHI officer first', 'error'); return; }
    try {
      await api.assignWorkOrder(woId, phi.user_id);
      set({ dispatchOrder: null, activeOrder: null });
      get().toast(`Work order assigned to ${phi.name}`, 'success');
      await get().fetchData();
    } catch (err: any) {
      get().toast(err.message || 'Failed to assign team', 'error');
    }
  },

  resolveWO: async (woId) => {
    const notes = window.prompt('Resolution notes (min 10 characters):', 'Remediation completed successfully.');
    if (notes === null) return;
    if (notes.trim().length < 10) {
      get().toast('Notes must be at least 10 characters', 'error');
      return;
    }
    const rl = window.prompt('Verified risk level after remediation (none / low / medium / high / critical):', 'none');
    const validRl = ['none', 'low', 'medium', 'high', 'critical'];
    const verifiedRl = rl && validRl.includes(rl.toLowerCase()) ? rl.toLowerCase() : undefined;
    try {
      await api.resolveWorkOrder(woId, notes, verifiedRl);
      set({ activeOrder: null });
      get().toast('Work order resolved', 'success');
      await get().fetchData();
    } catch (err: any) {
      get().toast(err.message || 'Failed to resolve work order', 'error');
    }
  },

  acceptWO: async (woId) => {
    try {
      await api.acceptWorkOrder(woId);
      get().toast('Work order accepted', 'success');
      await get().fetchData();
    } catch (err: any) {
      get().toast(err.message || 'Failed to accept work order', 'error');
    }
  },

  sendChat: async (txt) => {
    if (!txt.trim()) return;
    const userMsg: ChatMessage = { role: 'user', content: txt, lang: 'en' };
    set((s) => ({ chat: [...s.chat, userMsg] }));
    try {
      const sessionId = get().chatSessionId;
      const res = await api.sendChatMessage(txt, sessionId);
      const replyMsg: ChatMessage = { role: 'assistant', content: res.reply, lang: 'en' };
      set((s) => ({ chat: [...s.chat, replyMsg], chatSessionId: res.session_id }));
    } catch (err: any) {
      const errMsg: ChatMessage = {
        role: 'assistant',
        content: `⚠️ ${err.message || 'Could not reach AI assistant. Please try again.'}`,
        lang: 'en',
      };
      set((s) => ({ chat: [...s.chat, errMsg] }));
    }
  },

  exportCsv: async () => {
    try {
      await api.exportCsv();
      get().toast('CSV export downloaded', 'success');
    } catch (err: any) {
      get().toast(err.message || 'Export failed', 'error');
    }
  },

  registerStaff: async (data) => {
    try {
      await api.registerStaff(data);
      get().toast(`Staff account created for ${data.email}`, 'success');
      await get().fetchStaffUsers();
    } catch (err: any) {
      get().toast(err.message || 'Failed to create staff account', 'error');
      throw err;
    }
  },

  updateStaff: async (userId, data) => {
    try {
      await api.updateStaff(userId, data);
      get().toast('Staff account updated', 'success');
      await get().fetchStaffUsers();
    } catch (err: any) {
      get().toast(err.message || 'Failed to update staff account', 'error');
      throw err;
    }
  },

  selectZone: (z) => set({ selZone: z, selPred: null, selIncident: null }),
  selectPrediction: (p) => set({ selPred: p, selZone: null, selIncident: null }),
  selectIncident: (inc) => set({ selIncident: inc, selZone: null, selPred: null }),
  setActiveReport: (r) => set({ activeReport: r }),
  setActiveOrder: (o) => set({ activeOrder: o }),
  setDispatchOrder: (o) => set({ dispatchOrder: o }),

  dismissPredAlert: () => {
    try { sessionStorage.setItem('dg_predAlert', '1'); } catch {}
    set({ predAlertDismissed: true });
  },

  // ── predictions panel ──
  openPredictions: () =>
    set((s) => {
      const layers = { ...s.layers, forecast: true };
      saveLS('dg_layers', layers);
      return { layers, predPanel: true };
    }),

  setPredPanel: (predPanel) => set({ predPanel }),

  showPredictionOnMap: (p) =>
    set((s) => {
      const layers = { ...s.layers, forecast: true };
      saveLS('dg_layers', layers);
      return {
        layers,
        predPanel: false,
        selPred: p,
        selIncident: null,
        selZone: null,
        view: 'dashboard',
        dashLayout: s.dashLayout === 'stats' ? 'split' : s.dashLayout,
      };
    }),

  // ── incidents / duplicates ──
  setReportFilter: (reportFilter) => set({ reportFilter }),
  setReportZone: (reportZone) => set({ reportZone }),
  setReportSev: (reportSev) => set({ reportSev }),
  setReportSite: (reportSite) => set({ reportSite }),
  setDupReviewOpen: (dupReviewOpen) => set({ dupReviewOpen }),
  setIotAlertOpen: (iotAlertOpen) => set({ iotAlertOpen }),
  setActiveIncident: (id) => set({ activeIncident: id, overrideDec: null, incReport: id ? get().incReport : null }),
  setIncReport: (r) => set({ incReport: r }),

  setIncidentStatus: async (id, status) => {
    try {
      await api.updateIncidentStatus(id, status);
      get().toast('Incident marked ' + INC_STATUS[status].label.toLowerCase(), 'success');
      await get().fetchData();
    } catch (err: any) {
      get().toast(err.message || 'Failed to update incident status', 'error');
    }
  },

  updateDecision: async (id, action, reason) => {
    try {
      const backendAction = action === 'approve' ? 'merge' : 'separate';
      await api.resolveDuplicateDecision(id, backendAction, reason || undefined);
      get().toast(
        action === 'approve' ? 'Match confirmed — report attached to incident' : 'New incident created from report',
        'success',
      );
      await get().fetchData();
    } catch (err: any) {
      get().toast(err.message || 'Failed to resolve duplicate decision', 'error');
    }
  },

  setOverrideDec: (overrideDec) => set({ overrideDec }),
  setMergeSource: (mergeSource) => set({ mergeSource, mergeQuery: '' }),
  setMergeQuery: (mergeQuery) => set({ mergeQuery }),

  mergeIncidents: (srcId, tgtId) => {
    set((s) => {
      const src = s.incidents.find((x) => x.incident_id === srcId);
      const tgt = s.incidents.find((x) => x.incident_id === tgtId);
      if (!src || !tgt) return { mergeSource: null };
      const incidents = s.incidents.map((x) =>
        x.incident_id === tgtId
          ? { ...x, confirmation_count: x.confirmation_count + src.confirmation_count, report_count: x.report_count + src.report_count }
          : x.incident_id === srcId
            ? { ...x, status: 'closed' as IncidentStatus, resolved_at: new Date().toISOString(), mergedInto: tgt.code }
            : x,
      );
      return { incidents, mergeSource: null, mergeQuery: '', activeIncident: tgtId };
    });
    get().toast('Incidents merged', 'success');
  },
}));

/** Pending duplicate decisions (used by the sidebar badge, dashboard KPI, and review panel). */
export const pendingDecisions = (decisions: Decision[]): Decision[] => decisions.filter((d) => d.status === 'pending');
