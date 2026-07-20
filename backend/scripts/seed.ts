import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import crypto from 'crypto';

/**
 * scripts/seed.ts — Extracts all Sri Lankan Provinces, Districts, and Grama Niladhari (GN) zones
 * from the official Survey Department / NSDI MapServer API (used in NDCU Dashboard risk zone view)
 * and seeds them into PostgreSQL PostGIS database with high-performance batching.
 *
 * Run via: npm run seed
 */

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL env var is required');
  process.exit(1);
}

const NSDI_SERVICE = 'https://gisapps.nsdi.gov.lk/server/rest/services/Srilanka/Boundaries/MapServer';

const pool = new Pool({ connectionString: DATABASE_URL });

function hashPassword(password: string): string {
  const salt = process.env.JWT_ACCESS_SECRET ?? 'dengue-salt';
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

function toTitleCase(str?: string): string {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface EsriFeature {
  attributes: {
    gnd_name?: string;
    gnd_number?: string;
    gnd_no_gazetted?: string;
    gnd_name_census?: string;
    ds_division_name?: string;
    district_name?: string;
    province_name?: string;
    [key: string]: any;
  };
  geometry?: {
    rings?: [number, number][][];
  };
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} when fetching ${url}`);
  }
  return res.json();
}

async function insertFeatureBatch(client: any, batch: EsriFeature[], fallbackProv: string) {
  if (batch.length === 0) return;

  const valueTuples: string[] = [];
  const params: any[] = [];
  let paramIdx = 1;

  for (const feature of batch) {
    const attrs = feature.attributes || {};
    const rawName = attrs.gnd_name || attrs.gnd_name_census || attrs.gnd_number || 'GN Zone';
    const numberStr = attrs.gnd_number || attrs.gnd_no_gazetted || attrs.gnd_no_census || '';
    const name = numberStr && !rawName.includes(numberStr)
      ? `${toTitleCase(rawName)} (${numberStr.trim()})`
      : toTitleCase(rawName);

    const district = toTitleCase(attrs.district_name || 'Colombo');
    const province = toTitleCase(attrs.province_name || fallbackProv);

    const rings = feature.geometry?.rings;
    let geomJson: string | null = null;
    if (rings && rings.length > 0) {
      geomJson = JSON.stringify({
        type: 'MultiPolygon',
        coordinates: [rings],
      });
    }

    // Risk calculation simulation (score 5-80, levels: low, medium, high, critical)
    const nameHash = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const riskScore = (nameHash % 75) + 5;
    const riskLevel = riskScore > 65 ? 'critical' : riskScore > 45 ? 'high' : riskScore > 25 ? 'medium' : 'low';

    if (geomJson) {
      valueTuples.push(
        `($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($${paramIdx + 3}::text), 4326)), $${paramIdx + 4}, $${paramIdx + 5})`
      );
      params.push(name, district, province, geomJson, riskScore, riskLevel);
      paramIdx += 6;
    } else {
      valueTuples.push(
        `($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, NULL, $${paramIdx + 3}, $${paramIdx + 4})`
      );
      params.push(name, district, province, riskScore, riskLevel);
      paramIdx += 5;
    }
  }

  const querySql = `
    INSERT INTO zones (name, district, province, geom, risk_score, risk_level)
    VALUES ${valueTuples.join(', ')}
  `;

  await client.query(querySql, params);
}

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Starting DengueGuard Zone & Development Data Seeding...\n');

    // ─── 1. Seed Core Demo Zones ─────────────────────────────────────────────
    console.log('📦 Seeding core demo zones...');
    await client.query(`
      INSERT INTO zones (id, name, district, province, risk_score, risk_level, active_report_count)
      VALUES
        ('00000000-0000-0000-0000-000000000001', 'Colombo Fort',    'Colombo',  'Western', 88, 'critical', 14),
        ('00000000-0000-0000-0000-000000000002', 'Pettah',          'Colombo',  'Western', 81, 'critical', 11),
        ('00000000-0000-0000-0000-000000000003', 'Maradana',        'Colombo',  'Western', 67, 'high',      8),
        ('00000000-0000-0000-0000-000000000004', 'Slave Island',    'Colombo',  'Western', 59, 'high',      6),
        ('00000000-0000-0000-0000-000000000005', 'Kollupitiya',     'Colombo',  'Western', 44, 'medium',    4),
        ('00000000-0000-0000-0000-000000000006', 'Borella',         'Colombo',  'Western', 38, 'medium',    3),
        ('00000000-0000-0000-0000-000000000007', 'Bambalapitiya',   'Colombo',  'Western', 22, 'low',       1),
        ('00000000-0000-0000-0000-000000000008', 'Wellawatte',      'Colombo',  'Western', 17, 'low',       1)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        district = EXCLUDED.district,
        province = EXCLUDED.province,
        risk_score = EXCLUDED.risk_score,
        risk_level = EXCLUDED.risk_level,
        active_report_count = EXCLUDED.active_report_count
    `);
    console.log('✅ Core demo zones seeded');

    // ─── 2. Extract Provinces & Grama Niladhari Zones from NSDI ─────────────
    console.log('\n🗺️ Extracting Provinces, Districts & Grama Niladhari Zones from NSDI MapServer...');

    // Fetch Provinces (Layer 4)
    const provUrl = `${NSDI_SERVICE}/4/query?where=1%3D1&outFields=*&returnGeometry=false&f=json`;
    const provData = await fetchJson(provUrl);
    const provinces: string[] = provData.features?.map((f: any) => f.attributes.province_name).filter(Boolean) || [
      'Western', 'Central', 'Southern', 'Northern', 'Eastern', 'North Western', 'North Central', 'Uva', 'Sabaragamuwa'
    ];

    console.log(`📍 Found ${provinces.length} Provinces: ${provinces.join(', ')}`);

    let totalGnExtracted = 0;
    const districtSet = new Set<string>();

    for (const provName of provinces) {
      console.log(`📡 Fetching Grama Niladhari divisions for Province: ${provName}...`);
      let offset = 0;
      const limit = 1000;
      let hasMore = true;
      let provGnCount = 0;

      while (hasMore) {
        const gnUrl = `${NSDI_SERVICE}/1/query?where=UPPER(province_name)%3D%27${encodeURIComponent(provName.toUpperCase())}%27`
          + `&outFields=*&returnGeometry=true&resultRecordCount=${limit}&resultOffset=${offset}&f=json`;

        const gnData = await fetchJson(gnUrl);
        const features: EsriFeature[] = gnData.features || [];

        if (features.length === 0) {
          hasMore = false;
          break;
        }

        // Insert in sub-batches of 200 items for high performance
        const subBatchSize = 200;
        await client.query('BEGIN');
        for (let i = 0; i < features.length; i += subBatchSize) {
          const chunk = features.slice(i, i + subBatchSize);
          chunk.forEach((f) => {
            if (f.attributes?.district_name) {
              districtSet.add(toTitleCase(f.attributes.district_name));
            }
          });
          await insertFeatureBatch(client, chunk, provName);
        }
        await client.query('COMMIT');

        provGnCount += features.length;
        totalGnExtracted += features.length;
        offset += limit;

        if (features.length < limit) {
          hasMore = false;
        }
      }
      console.log(`   └─ Added ${provGnCount} Grama Niladhari zones for ${provName}`);
    }

    console.log(`\n🎉 Extracted & uploaded ${totalGnExtracted} Grama Niladhari zones across ${districtSet.size} Districts in all ${provinces.length} Provinces!`);

    // ─── 3. Seed Staff Users ──────────────────────────────────────────────────
    console.log('\n👥 Seeding staff users...');
    await client.query(
      `INSERT INTO users (id, email, password_hash, full_name, role, language_preference)
       VALUES
         ('00000000-0000-0000-0001-000000000001', 'admin@dengueguard.lk',   $1, 'NDCU Admin',       'ndcu_admin',     'en'),
         ('00000000-0000-0000-0001-000000000002', 'phi@dengueguard.lk',     $2, 'S. Fernando (PHI)', 'phi',            'si'),
         ('00000000-0000-0000-0001-000000000003', 'drone@dengueguard.lk',   $3, 'Drone Operator 1', 'drone_operator', 'en'),
         ('00000000-0000-0000-0001-000000000004', 'phi2@dengueguard.lk',    $2, 'K. Perera (PHI)',  'phi',            'si'),
         ('00000000-0000-0000-0001-000000000005', 'phi3@dengueguard.lk',    $2, 'M. Silva (PHI)',   'phi',            'si'),
         ('00000000-0000-0000-0001-000000000006', 'phi4@dengueguard.lk',    $2, 'A. Jayasuriya (PHI)', 'phi',            'si'),
         ('00000000-0000-0000-0001-000000000007', 'phi5@dengueguard.lk',    $2, 'R. Wickrama (PHI)', 'phi',            'si')
       ON CONFLICT (id) DO NOTHING`,
      [hashPassword('Admin@123'), hashPassword('Phi@1234'), hashPassword('Drone@123')],
    );
    console.log('✅ Staff users seeded');

    console.log('\n📋 Dev credentials:');
    console.log('  NDCU Admin:      admin@dengueguard.lk  / Admin@123');
    console.log('  PHI Officer:     phi@dengueguard.lk    / Phi@1234');
    console.log('  Drone Operator:  drone@dengueguard.lk  / Drone@123');
    console.log('\n🌟 Complete! All provinces and Grama Niladhari zones loaded into database.');
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
