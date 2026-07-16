import { create } from 'zustand';
import type {
  CaseView,
  ChatMessage,
  DengueCase,
  LayerKey,
  Layers,
  LoginTab,
  Mission,
  Phi,
  Prediction,
  Report,
  Role,
  Toast,
  ToastKind,
  ViewKey,
  WorkOrder,
  Zone,
} from '../types';
import { RISK } from '../theme';
import { AGES, CASE_ZONES, HOSPITALS, SITES, ZONES } from '../data/zones';
import { mkCases, mkOrders, mkReports, pick } from '../data/mock';
import { loadLS, saveLS } from '../utils/storage';

const DEFAULT_LAYERS: Layers = {
  zones: true,
  community: true,
  drone: true,
  cases: false,
  forecast: false,
};

function readPredAlertDismissed(): boolean {
  try {
    return sessionStorage.getItem('dg_predAlert') === '1';
  } catch {
    return false;
  }
}

function viewForRole(role: Role): ViewKey {
  return role === 'phi' ? 'workorders' : role === 'drone_operator' ? 'drone' : 'dashboard';
}

export interface AppState {
  // ---- auth / shell ----
  authed: boolean;
  role: Role;
  loginTab: LoginTab;
  view: ViewKey;

  // ---- data ----
  reports: Report[];
  orders: WorkOrder[];
  cases: DengueCase[];
  missions: Mission[];

  // ---- selection / drawers ----
  activeReport: Report | null;
  activeOrder: WorkOrder | null;
  dispatchOrder: WorkOrder | null;
  selZone: Zone | null;
  selPred: Prediction | null;

  // ---- map controls ----
  layers: Layers;
  caseView: CaseView;
  dateFrom: number;
  dateTo: number;

  // ---- misc ----
  demoMode: boolean;
  predAlertDismissed: boolean;
  toasts: Toast[];
  chat: ChatMessage[];
  liveOn: boolean;

  // ---- actions ----
  setLoginTab: (tab: LoginTab) => void;
  login: (role: Role) => void;
  logout: () => void;
  setView: (v: ViewKey) => void;
  toggleLayer: (k: LayerKey) => void;
  enableForecastLayer: () => void;
  setCaseView: (v: CaseView) => void;
  setDateRange: (from: number, to: number) => void;
  toggleLive: () => void;
  toast: (t: string, kind: ToastKind) => void;
  liveTick: () => void;
  toggleDemo: () => void;
  demoTickReport: () => void;
  demoTickZone: () => void;
  demoTickCase: () => void;
  createWO: (r: Report) => void;
  dispatch: (woId: string, phi: Phi | null, instr: string) => void;
  resolveWO: (woId: string) => void;
  sendChat: (txt: string) => void;
  selectZone: (z: Zone | null) => void;
  selectPrediction: (p: Prediction | null) => void;
  setActiveReport: (r: Report | null) => void;
  setActiveOrder: (o: WorkOrder | null) => void;
  setDispatchOrder: (o: WorkOrder | null) => void;
  dismissPredAlert: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  authed: false,
  role: 'ndcu_admin',
  loginTab: 'email',
  view: 'dashboard',

  reports: mkReports(),
  orders: mkOrders(),
  cases: mkCases(60),
  missions: [
    { mission_id: 'M1', mission_name: 'Fort aerial survey — AM', status: 'complete', image_count: 48, processed_count: 48, summary: { critical: 6, high: 9, medium: 12, low: 21 } },
    { mission_id: 'M2', mission_name: 'Pettah market sweep', status: 'processing', image_count: 36, processed_count: 22, summary: { critical: 3, high: 5, medium: 8, low: 6 } },
    { mission_id: 'M3', mission_name: 'Maradana rail corridor', status: 'open', image_count: 0, processed_count: 0, summary: { critical: 0, high: 0, medium: 0, low: 0 } },
  ],

  activeReport: null,
  activeOrder: null,
  dispatchOrder: null,
  selZone: null,
  selPred: null,

  layers: loadLS<Layers>('dg_layers', DEFAULT_LAYERS),
  caseView: loadLS<CaseView>('dg_caseview', 'cluster'),
  dateFrom: 30,
  dateTo: 0,

  demoMode: false,
  predAlertDismissed: readPredAlertDismissed(),
  toasts: [],
  chat: [
    {
      role: 'assistant',
      content:
        "Hello. I'm the DengueGuard assistant. Ask me about zone risk, work orders, or reporting guidance — in English, Sinhala, or Tamil.",
      lang: 'en',
    },
  ],
  liveOn: true,

  // ---------- actions ----------
  setLoginTab: (loginTab) => set({ loginTab }),

  login: (role) => set({ authed: true, role, view: viewForRole(role) }),

  logout: () => set({ authed: false }),

  setView: (v) => set({ view: v, activeReport: null, activeOrder: null }),

  toggleLayer: (k) =>
    set((s) => {
      const layers = { ...s.layers, [k]: !s.layers[k] };
      saveLS('dg_layers', layers);
      return { layers };
    }),

  enableForecastLayer: () =>
    set((s) => {
      const layers = { ...s.layers, forecast: true };
      saveLS('dg_layers', layers);
      return { layers };
    }),

  setCaseView: (v) => {
    saveLS('dg_caseview', v);
    set({ caseView: v });
  },

  setDateRange: (from, to) => set({ dateFrom: from, dateTo: to }),

  toggleLive: () => set((s) => ({ liveOn: !s.liveOn })),

  toast: (t, kind) => {
    const id = Date.now() + Math.random();
    set((s) => ({ toasts: [...s.toasts, { id, t, kind }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 3800);
  },

  liveTick: () => {
    const s = get();
    if (!s.authed || !s.liveOn) return;
    const z = ZONES[Math.floor(Math.random() * 4)];
    const lv = Math.random() > 0.6 ? 'critical' : Math.random() > 0.5 ? 'high' : 'medium';
    const r: Report = {
      report_id: 'R' + Math.floor(Math.random() * 9000 + 2000),
      source_type: Math.random() > 0.5 ? 'community' : 'drone',
      lat: z.c[0][0] - Math.random() * 0.008,
      lng: z.c[0][1] + Math.random() * 0.012,
      description: 'Live report — standing water',
      status: 'analysed',
      risk_level: lv,
      confidence: 65 + Math.floor(Math.random() * 33),
      needs_human_review: false,
      remediation_action: 'Source reduction + larvicide',
      site_type: SITES[Math.floor(Math.random() * SITES.length)],
      larvae_visible: lv !== 'medium',
      guidance_text: 'Empty and scrub the container. Apply larvicide to residual water.',
      ai_analysis: {
        water_present: true,
        site_type: 'Container',
        larvae_visible: lv !== 'medium',
        reasoning: 'Live-triaged breeding site.',
      },
      zone_id: z.zone_id,
      zone_name: z.name,
      created_at: new Date().toISOString(),
      _new: true,
    };
    set((st) => ({ reports: [r, ...st.reports].slice(0, 60) }));
    get().toast('New ' + RISK[lv].label.toLowerCase() + '-risk report in ' + z.name, 'info');
  },

  toggleDemo: () => {
    const on = !get().demoMode;
    set({ demoMode: on });
    if (on) get().toast('Demo mode active — simulating live data', 'success');
    else get().toast('Demo mode stopped', 'info');
  },

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
      larvae_visible: true,
      guidance_text: 'Empty and scrub the container. Apply larvicide.',
      ai_analysis: {
        water_present: true,
        site_type: 'Container',
        larvae_visible: true,
        reasoning: 'Demo synthetic breeding site.',
      },
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
    get().toast(
      'zone:updated — ' + z.name + ' risk ' + (z.risk_score + Math.floor(Math.random() * 6 - 2)),
      'info',
    );
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

  createWO: (r) => {
    const wo: WorkOrder = {
      wo_id: 'WO' + Math.floor(Math.random() * 900 + 300),
      status: 'new',
      priority_score: r.confidence,
      assigned_to: null,
      lat: r.lat,
      lng: r.lng,
      zone_name: r.zone_name,
      zone_id: r.zone_id,
      risk_level: r.risk_level,
      confidence: r.confidence,
      site_type: r.site_type,
      remediation_action: r.remediation_action,
      guidance_text: r.guidance_text,
      larvae_visible: r.larvae_visible,
      image_url: null,
      description: r.description,
      ndcu_instructions: '',
      notes: '',
      outcome: null,
      created_at: new Date().toISOString(),
    };
    set((s) => ({ orders: [wo, ...s.orders], activeReport: null }));
    get().toast('Work order ' + wo.wo_id + ' created', 'success');
  },

  dispatch: (woId, phi, instr) => {
    set((s) => ({
      orders: s.orders.map((o) =>
        o.wo_id === woId ? { ...o, status: 'assigned', assigned_to: phi, ndcu_instructions: instr } : o,
      ),
      dispatchOrder: null,
      activeOrder: null,
    }));
    get().toast('Team dispatched to ' + (phi ? phi.name : 'unassigned'), 'success');
  },

  resolveWO: (woId) => {
    set((s) => ({
      orders: s.orders.map((o) =>
        o.wo_id === woId
          ? { ...o, status: 'resolved', outcome: 'resolved_clean', resolved_at: new Date().toISOString() }
          : o,
      ),
      activeOrder: null,
    }));
    get().toast('Work order marked resolved', 'success');
  },

  sendChat: (txt) => {
    if (!txt.trim()) return;
    const reply =
      'Based on current data, ' +
      ZONES[0].name +
      ' and ' +
      ZONES[1].name +
      ' are your highest-priority zones (' +
      ZONES[0].risk_score +
      ' and ' +
      ZONES[1].risk_score +
      '). I recommend dispatching source-reduction teams there first. Would you like me to draft work orders?';
    set((s) => ({
      chat: [...s.chat, { role: 'user', content: txt, lang: 'en' }, { role: 'assistant', content: reply, lang: 'en' }],
    }));
  },

  selectZone: (z) => set({ selZone: z, selPred: null }),
  selectPrediction: (p) => set({ selPred: p, selZone: null }),
  setActiveReport: (r) => set({ activeReport: r }),
  setActiveOrder: (o) => set({ activeOrder: o }),
  setDispatchOrder: (o) => set({ dispatchOrder: o }),

  dismissPredAlert: () => {
    try {
      sessionStorage.setItem('dg_predAlert', '1');
    } catch {
      /* ignore */
    }
    set({ predAlertDismissed: true });
  },
}));
