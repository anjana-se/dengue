import type { Species, Trap, TrapStatus } from '../types';
import { uuid } from '../utils/uuid';

interface TrapAnchor {
  zone_id: string;
  zone_name: string;
  district: string;
  lat: number;
  lng: number;
  w: number;
}

export const TRAP_ANCHORS: TrapAnchor[] = [
  { zone_id: 'Z1', zone_name: 'Colombo Fort', district: 'Colombo', lat: 6.935, lng: 79.849, w: 9 },
  { zone_id: 'Z3', zone_name: 'Maradana', district: 'Colombo', lat: 6.925, lng: 79.864, w: 9 },
  { zone_id: 'Z5', zone_name: 'Kollupitiya', district: 'Colombo', lat: 6.914, lng: 79.848, w: 8 },
  { zone_id: 'Z7', zone_name: 'Bambalapitiya', district: 'Colombo', lat: 6.901, lng: 79.856, w: 8 },
  { zone_id: 'Z2', zone_name: 'Pettah', district: 'Colombo', lat: 6.935, lng: 79.863, w: 5 },
  { zone_id: 'Z4', zone_name: 'Slave Island', district: 'Colombo', lat: 6.925, lng: 79.849, w: 4 },
  { zone_id: 'Z6', zone_name: 'Borella', district: 'Colombo', lat: 6.914, lng: 79.878, w: 3 },
  { zone_id: 'Z8', zone_name: 'Wellawatte', district: 'Colombo', lat: 6.888, lng: 79.858, w: 3 },
];

const HR = 3600e3;
const DAY = 864e5;

export function mkTraps(): Trap[] {
  const out: Trap[] = [];
  const now = Date.now();
  const statuses: TrapStatus[] = [];
  for (let i = 0; i < 32; i++) statuses.push('active');
  for (let i = 0; i < 5; i++) statuses.push('offline');
  for (let i = 0; i < 3; i++) statuses.push('maintenance');
  const pool: TrapAnchor[] = [];
  TRAP_ANCHORS.forEach((a) => {
    for (let i = 0; i < a.w; i++) pool.push(a);
  });
  for (let i = 0; i < 40; i++) {
    const a = pool[(i * 7) % pool.length];
    const status = statuses[i];
    const lowBat = i < 4;
    const battery = lowBat
      ? 6 + Math.floor(Math.random() * 13)
      : status === 'offline'
        ? 15 + Math.floor(Math.random() * 40)
        : 35 + Math.floor(Math.random() * 65);
    const base24 = Math.round(a.w * 6 + Math.random() * 46);
    const count24 = status === 'active' ? Math.min(120, base24) : Math.round(base24 * 0.4);
    const count7 = Math.min(800, count24 * 5 + Math.floor(Math.random() * 120));
    const species: Species[] =
      a.w >= 8
        ? ['aedes_aegypti', 'aedes_albopictus']
        : [Math.random() > 0.5 ? 'aedes_aegypti' : 'aedes_albopictus'];
    const lastSync =
      status === 'active'
        ? now - Math.floor(Math.random() * 6 * HR)
        : status === 'maintenance'
          ? now - Math.floor(10 + Math.random() * 8) * HR
          : now - Math.floor(26 + Math.random() * 46) * HR;
    out.push({
      trap_id: uuid(),
      serial_number: 'DG-TRAP-' + String(1000 + i * 7).slice(-4),
      lat: a.lat + (Math.random() - 0.5) * 0.012,
      lng: a.lng + (Math.random() - 0.5) * 0.012,
      zone_id: a.zone_id,
      zone_name: a.zone_name,
      district: a.district,
      status,
      battery_percent: battery,
      last_sync_at: new Date(lastSync).toISOString(),
      installed_at: new Date(now - (30 + Math.floor(Math.random() * 370)) * DAY).toISOString(),
      readings: {
        mosquito_count_24h: count24,
        mosquito_count_7d: count7,
        species_detected: species,
        larvae_detected: a.w >= 8 && Math.random() > 0.4,
        water_temp_c: Math.round((28 + Math.random() * 6) * 10) / 10,
        humidity_percent: Math.round((65 + Math.random() * 30) * 10) / 10,
        trap_fill_percent: Math.floor(Math.random() * 100),
      },
    });
  }
  return out;
}
