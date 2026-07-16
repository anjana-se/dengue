// Central Leaflet entry: guarantees the global `L` is set (via ./leaflet-global)
// BEFORE the marker-cluster / heat plugins evaluate and register onto it.
import L from './leaflet-global';
import 'leaflet.markercluster';
import 'leaflet.heat';

export default L;
