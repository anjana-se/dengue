import { create } from 'zustand';
import type {
  CaseView,
  ChatMessage,
  DengueCase,
  LayerKey,
  Layers,
  LoginTab,
  Phi,
  Prediction,
  Report,
  Role,
  StaffUser,
  CurrentUser,
  Toast,
  ToastKind,
  ViewKey,
  WorkOrder,
  WorkOrderStatus,
  Zone,
} from '../types';
import { RISK } from '../theme';
import { AGES, CASE_ZONES, HOSPITALS } from '../data/zones';
import { mkCases, pick } from '../data/mock';
import { loadLS, saveLS } from '../utils/storage';
import { api } from '../lib/api';

const DEFAULT_LAYERS: Layers = {
  zones: true,
  community: true,
  drone: true,
  cases: false,
  forecast: false,
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

  // ── data ──
  reports: Report[];
  orders: WorkOrder[];
  cases: DengueCase[];
  missions: any[];
  zones: Zone[];
  staffUsers: StaffUser[];
  dashboardSummary: any | null;

  // ── selection / drawers ──
  activeReport: Report | null;
  activeOrder: WorkOrder | null;
  dispatchOrder: WorkOrder | null;
  selZone: Zone | null;
  selPred: Prediction | null;

  // ── map controls ──
  layers: Layers;
  caseView: CaseView;
  dateFrom: number;
  dateTo: number;

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
  toggleLayer: (k: LayerKey) => void;
  enableForecastLayer: () => void;
  setCaseView: (v: CaseView) => void;
  setDateRange: (from: number, to: number) => void;
  toggleLive: () => void;
  toggleDemo: () => void;
  toast: (t: string, kind: ToastKind) => void;
  liveTick: () => void;
  demoTickCase: () => void;

  // ── data ops ──
  fetchData: () => Promise<void>;
  fetchStaffUsers: () => Promise<void>;
  createWO: (r: Report) => Promise<void>;
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
  setActiveReport: (r: Report | null) => void;
  setActiveOrder: (o: WorkOrder | null) => void;
  setDispatchOrder: (o: WorkOrder | null) => void;
  dismissPredAlert: () => void;
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
    larvae_visible: r?.larvae_visible ?? false,
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

  reports: [],
  orders: [],
  cases: mkCases(60),
  missions: [],
  zones: [],
  staffUsers: [],
  dashboardSummary: null,

  activeReport: null,
  activeOrder: null,
  dispatchOrder: null,
  selZone: null,
  selPred: null,

  layers: loadLS<Layers>('dg_layers', DEFAULT_LAYERS),
  caseView: loadLS<CaseView>('dg_caseview', 'cluster'),
  dateFrom: 30,
  dateTo: 0,

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

      if (role === 'ndcu_admin') {
        [missions] = await Promise.all([api.getDroneMissions()]);
        try { dashboardSummary = await api.getDashboardSummary(); } catch {}
      }

      set({
        zones: updatedZones,
        reports,
        orders,
        dashboardSummary,
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
    set({ view: v, activeReport: null, activeOrder: null });
    // Fetch staff users when navigating to users panel
    if (v === 'users') get().fetchStaffUsers();
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
  setDateRange: (from, to) => set({ dateFrom: from, dateTo: to }),
  toggleLive: () => set((s) => ({ liveOn: !s.liveOn })),
  toggleDemo: () => {
    const on = !get().demoMode;
    set({ demoMode: on });
    get().toast(on ? 'Live polling paused (demo UI)' : 'Demo stopped', 'info');
  },

  toast: (t, kind) => {
    const id = Date.now() + Math.random();
    set((s) => ({ toasts: [...s.toasts, { id, t, kind }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 3800);
  },

  liveTick: async () => {
    const s = get();
    if (!s.authed || !s.liveOn || s.demoMode) return;
    await s.fetchData();
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
      severity: severity as any,
      hospital: pick(HOSPITALS),
      status: 'active',
    };
    set((s) => ({ cases: [c, ...s.cases] }));
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
    const rl = window.prompt('Verified risk level after remediation (low / medium / high / critical):', 'low');
    const validRl = ['low', 'medium', 'high', 'critical'];
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

  selectZone: (z) => set({ selZone: z, selPred: null }),
  selectPrediction: (p) => set({ selPred: p, selZone: null }),
  setActiveReport: (r) => set({ activeReport: r }),
  setActiveOrder: (o) => set({ activeOrder: o }),
  setDispatchOrder: (o) => set({ dispatchOrder: o }),

  dismissPredAlert: () => {
    try { sessionStorage.setItem('dg_predAlert', '1'); } catch {}
    set({ predAlertDismissed: true });
  },
}));
