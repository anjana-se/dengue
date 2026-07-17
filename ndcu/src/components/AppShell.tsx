import Sidebar from './Sidebar';
import Topbar from './Topbar';
import MapView from './map/MapView';
import LayerToggle from './map/LayerToggle';
import MapLegend from './map/MapLegend';
import ZonePopup from './map/ZonePopup';
import PredictionPopup from './map/PredictionPopup';
import Dashboard from './panels/Dashboard';
import Reports from './panels/Reports';
import WorkOrders from './panels/WorkOrders';
import DroneMissions from './panels/DroneMissions';
import Assistant from './panels/Assistant';
import UserManagement from './panels/UserManagement';
import OrderDrawer from './panels/OrderDrawer';
import IncidentDrawer from './panels/IncidentDrawer';
import PredictionsPanel from './panels/PredictionsPanel';
import MergeModal from './modals/MergeModal';
import { useStore } from '../store/useStore';
import type { DashLayout, ViewKey } from '../types';

/** Views that show the side map panel */
const MAP_VIEWS: ViewKey[] = ['dashboard', 'reports', 'workorders'];

function mapWidths(view: ViewKey, layout: DashLayout): { mapW: string; statsW: string; showMap: boolean; showStats: boolean } {
  const isMap = MAP_VIEWS.includes(view);
  if (!isMap) return { mapW: '0', statsW: '100%', showMap: false, showStats: true };
  if (layout === 'map') return { mapW: '100%', statsW: '0', showMap: true, showStats: false };
  if (layout === 'stats') return { mapW: '0', statsW: '100%', showMap: false, showStats: true };
  // split
  const mw = view === 'dashboard' ? '56%' : view === 'workorders' ? '42%' : '52%';
  return { mapW: mw, statsW: 'auto', showMap: true, showStats: true };
}

function ContentPanel({ view }: { view: ViewKey }) {
  switch (view) {
    case 'dashboard':   return <Dashboard />;
    case 'reports':     return <Reports />;
    case 'workorders':  return <WorkOrders />;
    case 'chat':        return <Assistant />;
    case 'drone':       return <DroneMissions />;
    case 'users':       return <UserManagement />;
    default:            return null;
  }
}

export default function AppShell() {
  const view = useStore((s) => s.view);
  const dashLayout = useStore((s) => s.dashLayout);
  const selZone = useStore((s) => s.selZone);
  const selPred = useStore((s) => s.selPred);
  const activeOrder = useStore((s) => s.activeOrder);
  const activeIncident = useStore((s) => s.activeIncident);
  const predPanel = useStore((s) => s.predPanel);
  const mergeSource = useStore((s) => s.mergeSource);

  const isMapView = MAP_VIEWS.includes(view);
  const { mapW, showMap, showStats } = mapWidths(view, dashLayout);

  return (
    <div style={{ height: '100%', display: 'flex', background: '#eef1f0' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar mapCapable={isMapView} />
        <div style={{ flex: 1, display: 'flex', minHeight: 0, padding: 14, gap: showMap && showStats ? 14 : 0 }}>

          {/* Map column – mounted but hidden when not relevant */}
          <div
            style={{
              width: showMap ? mapW : 0,
              display: showMap ? 'block' : 'none',
              flex: showMap && !showStats ? 1 : undefined,
              position: 'relative',
              borderRadius: 12,
              overflow: 'hidden',
              border: showMap ? '1px solid #e2e8e5' : 'none',
              boxShadow: '0 1px 4px rgba(0,0,0,.06)',
              flexShrink: 0,
            }}
          >
            <MapView />
            {showMap && <LayerToggle />}
            {showMap && <MapLegend />}
            {showMap && selZone && <ZonePopup />}
            {showMap && selPred && <PredictionPopup />}
          </div>

          {/* Content column */}
          {showStats && (
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <ContentPanel view={view} />
            </div>
          )}
        </div>
      </div>

      {/* Global overlays */}
      {activeOrder && <OrderDrawer />}
      {activeIncident && view !== 'reports' && <IncidentDrawer />}
      {predPanel && <PredictionsPanel />}
      {mergeSource && <MergeModal />}
    </div>
  );
}
