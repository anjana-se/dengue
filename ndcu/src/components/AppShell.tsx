import Sidebar from './Sidebar';
import Topbar from './Topbar';
import MapView from './map/MapView';
import LayerToggle from './map/LayerToggle';
import ZonePopup from './map/ZonePopup';
import PredictionPopup from './map/PredictionPopup';
import Dashboard from './panels/Dashboard';
import Reports from './panels/Reports';
import WorkOrders from './panels/WorkOrders';
import DroneMissions from './panels/DroneMissions';
import Assistant from './panels/Assistant';
import UserManagement from './panels/UserManagement';
import OrderDrawer from './panels/OrderDrawer';
import { useStore } from '../store/useStore';
import type { ViewKey } from '../types';

/** Views that show the side map panel */
const MAP_VIEWS: ViewKey[] = ['dashboard', 'reports', 'workorders'];

function mapWidth(view: ViewKey): string {
  if (view === 'dashboard') return '56%';
  if (view === 'workorders') return '42%';
  return '52%';
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
  const selZone = useStore((s) => s.selZone);
  const selPred = useStore((s) => s.selPred);
  const activeOrder = useStore((s) => s.activeOrder);

  const showMap = MAP_VIEWS.includes(view);
  const mapW = mapWidth(view);

  return (
    <div style={{ height: '100%', display: 'flex', background: '#eef1f0' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar />
        <div style={{ flex: 1, display: 'flex', minHeight: 0, padding: 14, gap: showMap ? 14 : 0 }}>

          {/* Map column – mounted but hidden when not relevant */}
          <div
            style={{
              width: showMap ? mapW : 0,
              display: showMap ? 'block' : 'none',
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
            {showMap && selZone && <ZonePopup />}
            {showMap && selPred && <PredictionPopup />}
          </div>

          {/* Content column */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <ContentPanel view={view} />
          </div>
        </div>
      </div>

      {/* Global Order Drawer overlay */}
      {activeOrder && <OrderDrawer />}
    </div>
  );
}
