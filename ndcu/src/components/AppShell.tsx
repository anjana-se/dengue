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
import { useStore } from '../store/useStore';
import type { ViewKey } from '../types';

function mapWidth(view: ViewKey): string {
  return view === 'dashboard' ? '58%' : view === 'workorders' ? '45%' : '55%';
}

function RightPanel({ view }: { view: ViewKey }) {
  switch (view) {
    case 'dashboard':
      return <Dashboard />;
    case 'reports':
      return <Reports />;
    case 'workorders':
      return <WorkOrders />;
    default:
      return null;
  }
}

export default function AppShell() {
  const view = useStore((s) => s.view);
  const selZone = useStore((s) => s.selZone);
  const selPred = useStore((s) => s.selPred);

  const mapShown = view === 'dashboard' || view === 'reports' || view === 'workorders';
  const mapW = mapWidth(view);

  return (
    <div style={{ height: '100%', display: 'flex', background: '#eef1f0' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar />
        <div style={{ flex: 1, display: 'flex', minHeight: 0, padding: 14, gap: mapShown ? 14 : 0 }}>
          {/* Map column — kept mounted across views so the Leaflet instance persists. */}
          <div
            style={{
              width: mapShown ? mapW : 0,
              display: mapShown ? 'block' : 'none',
              position: 'relative',
              borderRadius: 12,
              overflow: 'hidden',
              border: mapShown ? '1px solid #e2e8e5' : 'none',
              boxShadow: '0 1px 3px rgba(0,0,0,.05)',
              flexShrink: 0,
            }}
          >
            <MapView />
            {mapShown && <LayerToggle />}
            {mapShown && selZone && <ZonePopup />}
            {mapShown && selPred && <PredictionPopup />}
          </div>

          {/* Content column */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            {view === 'chat' ? (
              <Assistant />
            ) : view === 'drone' ? (
              <DroneMissions />
            ) : (
              <RightPanel view={view} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
