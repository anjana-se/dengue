import L from 'leaflet';

// leaflet.heat (0.2.0) reads a global `L` rather than importing the module,
// so we expose it before the plugin bundles evaluate (see ./leaflet.ts).
(window as unknown as { L: typeof L }).L = L;

export default L;
