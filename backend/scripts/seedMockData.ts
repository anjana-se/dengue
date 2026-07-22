import { Pool, PoolClient } from 'pg';
import * as dotenv from 'dotenv';

/**
 * scripts/seedMockData.ts — Seeds SYNTHETIC demo data for the operational
 * dashboard layers and the AI assistant:
 *
 *   • zones      — 8 fixed Colombo GN divisions (matching the ndcu frontend UUIDs)
 *   • iot_traps  — ~40 mosquito traps + one latest reading each
 *   • cases      — ~140 dengue cases (spread over the last ~45 days)
 *   • forecasts  — one 14-day outbreak forecast per zone
 *
 * All data is 100% synthetic — no real patients, no real coordinates of interest.
 * Do NOT load real patient data through this script without PDPA / compliance review.
 *
 * Idempotent:
 *   - zones/forecasts use fixed keys + ON CONFLICT DO NOTHING
 *   - traps/cases are skipped entirely if their tables already have rows
 *     (their child/serial rows have no natural upsert key)
 * Safe to re-run. To force a fresh seed, TRUNCATE the tables first
 * (see backend/docs/mock-data.md).
 *
 * Run via: npm run seed:mock   (after npm run migrate && npm run seed)
 */

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL env var is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

const DAY = 864e5;
const HR = 3600e3;

// ─── Zones (fixed UUIDs match ndcu/src/data/zones.ts so the frontend lines up) ──
interface ZoneSeed {
  id: string;
  name: string;
  ring: [number, number][]; // [lat, lng] pairs (frontend order)
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
}

const ZONES: ZoneSeed[] = [
  { id: '00000000-0000-0000-0000-000000000001', name: 'Colombo Fort',  ring: [[6.94, 79.842], [6.94, 79.856], [6.93, 79.856], [6.93, 79.842]], risk_score: 85, risk_level: 'critical' },
  { id: '00000000-0000-0000-0000-000000000002', name: 'Pettah',        ring: [[6.94, 79.856], [6.94, 79.87], [6.93, 79.87], [6.93, 79.856]],   risk_score: 72, risk_level: 'high' },
  { id: '00000000-0000-0000-0000-000000000003', name: 'Maradana',      ring: [[6.93, 79.856], [6.93, 79.872], [6.92, 79.872], [6.92, 79.856]], risk_score: 66, risk_level: 'high' },
  { id: '00000000-0000-0000-0000-000000000004', name: 'Slave Island',  ring: [[6.93, 79.842], [6.93, 79.856], [6.92, 79.856], [6.92, 79.842]], risk_score: 50, risk_level: 'medium' },
  { id: '00000000-0000-0000-0000-000000000005', name: 'Kollupitiya',   ring: [[6.92, 79.84], [6.92, 79.856], [6.908, 79.856], [6.908, 79.84]], risk_score: 44, risk_level: 'medium' },
  { id: '00000000-0000-0000-0000-000000000006', name: 'Borella',       ring: [[6.92, 79.87], [6.92, 79.886], [6.908, 79.886], [6.908, 79.87]], risk_score: 38, risk_level: 'medium' },
  { id: '00000000-0000-0000-0000-000000000007', name: 'Bambalapitiya', ring: [[6.908, 79.848], [6.908, 79.864], [6.895, 79.864], [6.895, 79.848]], risk_score: 24, risk_level: 'low' },
  { id: '00000000-0000-0000-0000-000000000008', name: 'Wellawatte',    ring: [[6.895, 79.85], [6.895, 79.866], [6.882, 79.866], [6.882, 79.85]], risk_score: 18, risk_level: 'low' },
];

const DISTRICT = 'Colombo';
const PROVINCE = 'Western';

/** [lat,lng] ring → closed WKT POLYGON in (lng lat) order for PostGIS. */
function ringToPolygonWKT(ring: [number, number][]): string {
  const pts = ring.map(([lat, lng]) => `${lng} ${lat}`);
  pts.push(pts[0]); // close the ring
  return `POLYGON((${pts.join(', ')}))`;
}

// ─── Trap anchors (ported from ndcu/src/data/traps.ts, mapped to real zone ids) ─
interface TrapAnchor { zoneNum: number; lat: number; lng: number; w: number }
const TRAP_ANCHORS: TrapAnchor[] = [
  { zoneNum: 1, lat: 6.935, lng: 79.849, w: 9 }, // Colombo Fort
  { zoneNum: 3, lat: 6.925, lng: 79.864, w: 9 }, // Maradana
  { zoneNum: 5, lat: 6.914, lng: 79.848, w: 8 }, // Kollupitiya
  { zoneNum: 7, lat: 6.901, lng: 79.856, w: 8 }, // Bambalapitiya
  { zoneNum: 2, lat: 6.935, lng: 79.863, w: 5 }, // Pettah
  { zoneNum: 4, lat: 6.925, lng: 79.849, w: 4 }, // Slave Island
  { zoneNum: 6, lat: 6.914, lng: 79.878, w: 3 }, // Borella
  { zoneNum: 8, lat: 6.888, lng: 79.858, w: 3 }, // Wellawatte
];

// ─── Case zones (ported from ndcu/src/data/zones.ts CASE_ZONES) ─────────────────
interface CaseZone { n: string; d: string; lat: number; lng: number; w: number }
const CASE_ZONES: CaseZone[] = [
  { n: 'Colombo 1 — Fort', d: 'Colombo', lat: 6.935, lng: 79.843, w: 9 },
  { n: 'Colombo 3 — Maradana', d: 'Colombo', lat: 6.925, lng: 79.862, w: 10 },
  { n: 'Colombo 5 — Havelock', d: 'Colombo', lat: 6.889, lng: 79.868, w: 9 },
  { n: 'Colombo 7 — Cinnamon Gardens', d: 'Colombo', lat: 6.91, lng: 79.868, w: 8 },
  { n: 'Colombo 2 — Slave Island', d: 'Colombo', lat: 6.92, lng: 79.848, w: 5 },
  { n: 'Colombo 6 — Wellawatte', d: 'Colombo', lat: 6.876, lng: 79.862, w: 4 },
  { n: 'Gampaha Town', d: 'Gampaha', lat: 7.087, lng: 79.999, w: 8 },
  { n: 'Ragama', d: 'Gampaha', lat: 7.029, lng: 79.922, w: 4 },
  { n: 'Ja-Ela', d: 'Gampaha', lat: 7.074, lng: 79.892, w: 3 },
];

type Species = 'aedes_aegypti' | 'aedes_albopictus';
type Severity = 'mild' | 'moderate' | 'severe';

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function wpick(zs: CaseZone[]): CaseZone {
  const tot = zs.reduce((a, z) => a + z.w, 0);
  let r = Math.random() * tot;
  for (const z of zs) {
    if ((r -= z.w) <= 0) return z;
  }
  return zs[0];
}

async function tableCount(client: PoolClient, table: string): Promise<number> {
  const res = await client.query(`SELECT COUNT(*)::int AS c FROM ${table}`);
  return res.rows[0].c as number;
}

// ─── Seed steps ─────────────────────────────────────────────────────────────
async function seedZones(client: PoolClient): Promise<void> {
  console.log('🗺️  Seeding zones...');
  // Upsert: these 8 fixed-UUID zones are synthetic demo scaffolding, so backfill
  // their geometry + risk even if a placeholder row (e.g. NULL geom) already
  // exists. Only our fixed UUIDs conflict — real dynamically-created zones are
  // never touched.
  for (const z of ZONES) {
    await client.query(
      `INSERT INTO zones (id, name, district, province, geom, risk_score, risk_level, active_report_count)
       VALUES ($1, $2, $3, $4, ST_Multi(ST_GeomFromText($5, 4326)), $6, $7, 0)
       ON CONFLICT (id) DO UPDATE SET
         name       = EXCLUDED.name,
         district   = EXCLUDED.district,
         province   = EXCLUDED.province,
         geom       = EXCLUDED.geom,
         risk_score = EXCLUDED.risk_score,
         risk_level = EXCLUDED.risk_level,
         updated_at = NOW()`,
      [z.id, z.name, DISTRICT, PROVINCE, ringToPolygonWKT(z.ring), z.risk_score, z.risk_level],
    );
  }
  console.log(`✅ Zones: ${ZONES.length} upserted (geometry + risk applied)`);
}

async function seedTraps(client: PoolClient): Promise<void> {
  const existing = await tableCount(client, 'iot_traps');
  if (existing > 0) {
    console.log(`⏭️  IoT traps: ${existing} rows already present — skipping.`);
    return;
  }
  console.log('📡 Seeding IoT traps + readings...');

  const now = Date.now();
  const statuses: ('active' | 'offline' | 'maintenance')[] = [];
  for (let i = 0; i < 32; i++) statuses.push('active');
  for (let i = 0; i < 5; i++) statuses.push('offline');
  for (let i = 0; i < 3; i++) statuses.push('maintenance');

  const anchorPool: TrapAnchor[] = [];
  TRAP_ANCHORS.forEach((a) => { for (let i = 0; i < a.w; i++) anchorPool.push(a); });

  const zoneIdByNum = (num: number) => ZONES[num - 1].id;

  for (let i = 0; i < 40; i++) {
    const a = anchorPool[(i * 7) % anchorPool.length];
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
    const installed = now - (30 + Math.floor(Math.random() * 370)) * DAY;
    const lat = a.lat + (Math.random() - 0.5) * 0.012;
    const lng = a.lng + (Math.random() - 0.5) * 0.012;
    const serial = 'DG-TRAP-' + String(1000 + i * 7).slice(-4);

    const trapRes = await client.query(
      `INSERT INTO iot_traps (
         serial_number, location, latitude, longitude, zone_id, district,
         status, battery_percent, last_sync_at, installed_at
       ) VALUES (
         $1, ST_SetSRID(ST_MakePoint($3, $2), 4326), $2, $3, $4, $5, $6, $7, $8, $9
       ) RETURNING id`,
      [
        serial, lat, lng, zoneIdByNum(a.zoneNum), DISTRICT, status, battery,
        new Date(lastSync).toISOString(), new Date(installed).toISOString(),
      ],
    );
    const trapId = trapRes.rows[0].id as string;

    await client.query(
      `INSERT INTO trap_readings (
         trap_id, mosquito_count_24h, mosquito_count_7d, species_detected,
         larvae_detected, water_temp_c, humidity_percent, trap_fill_percent
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        trapId, count24, count7, species,
        a.w >= 8 && Math.random() > 0.4,
        Math.round((28 + Math.random() * 6) * 10) / 10,
        Math.round((65 + Math.random() * 30) * 10) / 10,
        Math.floor(Math.random() * 100),
      ],
    );
  }
  console.log('✅ IoT traps: 40 traps + 40 readings inserted');
}

/**
 * Best-effort spatial link of cases to seeded zones. Cases use a richer zone
 * taxonomy (incl. Gampaha) than the 8 map zones, so many legitimately stay
 * unlinked (zone_id NULL) and rely on their zone_name/district text — the AI
 * case tool is aggregate-only regardless. Idempotent; runs every seed.
 */
async function backfillCaseZones(client: PoolClient): Promise<void> {
  const res = await client.query(
    `UPDATE cases
       SET zone_id = z.id, updated_at = NOW()
       FROM zones z
      WHERE z.geom IS NOT NULL
        AND ST_Within(cases.location, z.geom)
        AND cases.zone_id IS DISTINCT FROM z.id`,
  );
  console.log(`🔗 Case→zone links: ${res.rowCount ?? 0} case(s) matched to a zone by location`);
}

async function seedCases(client: PoolClient): Promise<void> {
  const existing = await tableCount(client, 'cases');
  if (existing > 0) {
    console.log(`⏭️  Dengue cases: ${existing} rows already present — skipping insert.`);
    return;
  }
  console.log('🏥 Seeding dengue cases...');

  const N = 140;
  const now = Date.now();
  const colomboHospitals = [
    'National Hospital Colombo',
    'Colombo South Teaching Hospital',
    'Lady Ridgeway Hospital',
    'De Soysa Maternity Hospital',
  ];
  const gampahaHospitals = ['Gampaha District General Hospital', 'Ragama Teaching Hospital'];

  for (let i = 0; i < N; i++) {
    const z = wpick(CASE_ZONES);
    // Bias most cases into the frontend's default 30-day window so the dashboard shows them.
    const daysAgo =
      Math.random() < 0.6 ? Math.floor(Math.random() * 14) : Math.floor(14 + Math.random() * 31);
    const sevR = Math.random();
    const severity: Severity = sevR < 0.55 ? 'mild' : sevR < 0.85 ? 'moderate' : 'severe';
    const ageR = Math.random();
    const age = ageR < 0.12 ? '0-14' : ageR < 0.52 ? '15-34' : ageR < 0.9 ? '35-59' : '60+';
    const lat = z.lat + (Math.random() - 0.5) * 0.02;
    const lng = z.lng + (Math.random() - 0.5) * 0.02;
    const caseId = `DEN-2026-${String(i + 1).padStart(4, '0')}`;
    const hospital = z.d === 'Gampaha' ? pick(gampahaHospitals) : pick(colomboHospitals);
    const status =
      daysAgo < 10
        ? Math.random() < 0.7 ? 'active' : 'recovered'
        : Math.random() < 0.15 ? 'active' : 'recovered';

    // zone_id is resolved to a seeded zone if the point falls inside one, else NULL.
    await client.query(
      `INSERT INTO cases (
         case_id, zone_id, location, latitude, longitude, district, zone_name,
         reported_date, age_group, severity, hospital, status
       ) VALUES (
         $1,
         (SELECT id FROM zones WHERE ST_Within(ST_SetSRID(ST_MakePoint($3, $2), 4326), geom) LIMIT 1),
         ST_SetSRID(ST_MakePoint($3, $2), 4326),
         $2, $3, $4, $5, $6, $7, $8, $9, $10
       )`,
      [
        caseId, lat, lng, z.d, z.n,
        new Date(now - daysAgo * DAY).toISOString(),
        age, severity, hospital, status,
      ],
    );
  }
  console.log(`✅ Dengue cases: ${N} inserted`);
}

async function seedForecasts(client: PoolClient): Promise<void> {
  console.log('📈 Seeding outbreak forecasts...');
  // [outbreak_probability, risk_trend, alert_level] per zone (ndcu PRED_TUNE order).
  const TUNE: [number, 'rising' | 'stable' | 'falling', 'watch' | 'warning' | 'emergency'][] = [
    [0.91, 'rising', 'emergency'],
    [0.83, 'rising', 'warning'],
    [0.78, 'rising', 'warning'],
    [0.63, 'stable', 'watch'],
    [0.55, 'stable', 'watch'],
    [0.47, 'falling', 'watch'],
    [0.30, 'falling', 'watch'],
    [0.22, 'stable', 'watch'],
  ];

  let inserted = 0;
  for (let i = 0; i < ZONES.length; i++) {
    const z = ZONES[i];
    const [prob, trend, alert] = TUNE[i];
    const recommended_action =
      prob >= 0.9
        ? 'Immediate multi-team source reduction + emergency fogging'
        : prob >= 0.75
          ? 'Deploy priority larviciding and intensify surveillance'
          : prob >= 0.6
            ? 'Increase inspection frequency and community messaging'
            : 'Maintain routine monitoring';

    const res = await client.query(
      `INSERT INTO forecasts (
         zone_id, zone_name, forecast_horizon_days, outbreak_probability, risk_trend,
         confidence, breeding_site_density, recent_case_count, rainfall_mm_forecast,
         temperature_avg_c, humidity_percent, recommended_action, alert_level
       ) VALUES ($1, $2, 14, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (zone_id) DO NOTHING`,
      [
        z.id,
        z.name,
        prob,
        trend,
        0.7 + Math.round((0.95 - 0.7) * prob * 100) / 100,
        Math.min(1, 0.35 + prob * 0.6),
        Math.round(4 + prob * 22),
        Math.round(20 + prob * 60),
        Math.round((27 + prob * 5) * 10) / 10,
        Math.round(70 + prob * 18),
        recommended_action,
        alert,
      ],
    );
    inserted += res.rowCount ?? 0;
  }
  console.log(`✅ Forecasts: ${inserted} inserted (${ZONES.length - inserted} already present)`);
}

async function seed(): Promise<void> {
  const client = await pool.connect();
  try {
    console.log('🌱 Seeding DengueGuard SYNTHETIC mock data (zones, traps, cases, forecasts)...\n');
    await client.query('BEGIN');
    await seedZones(client);
    await seedTraps(client);
    await seedCases(client);
    await backfillCaseZones(client);
    await seedForecasts(client);
    await client.query('COMMIT');
    console.log('\n🌟 Complete! Mock data loaded.');
    console.log('ℹ️  All data is synthetic. Toggle the Case / IoT trap layers in the ndcu dashboard,');
    console.log('    and ask the AI assistant e.g. "which zones have offline traps?" or');
    console.log('    "what\'s the 14-day outbreak forecast?".');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});
