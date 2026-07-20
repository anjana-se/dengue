import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import crypto from 'crypto';

/**
 * scripts/seed.ts — Seeds the DengueGuard database with staff user accounts.
 *
 * Zones are NOT seeded here. They are created dynamically when community
 * reports come in — the backend resolves the reporter's GPS coordinates to
 * a Grama Niladhari (GN) division via the NSDI MapServer API and inserts
 * the zone into the `zones` table on-the-fly (see resolveZoneFromCoordinates
 * in reports.service.ts).
 *
 * Run via: npm run seed
 */

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL env var is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

function hashPassword(password: string): string {
  const salt = process.env.JWT_ACCESS_SECRET ?? 'dengue-salt';
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Starting DengueGuard Development Data Seeding...\n');

    // ─── Seed Staff Users ──────────────────────────────────────────────────
    console.log('👥 Seeding staff users...');
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
    console.log('\n🌟 Complete! Staff users loaded.');
    console.log('ℹ️  Zones are created dynamically when reports come in via GPS → NSDI MapServer lookup.');
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
