import { Pool } from 'pg';
import * as dotenv from 'dotenv';

/**
 * scripts/seed.ts — Seeds demo zones + sample users for local dev.
 * Run via: npm run seed
 *
 * Seeds:
 *  - Colombo & Gampaha zones (from migration 009 seed data)
 *  - 1 NDCU admin, 1 PHI user, 1 drone operator
 *
 * NOTE: This is separate from migration 009_seed_zones which handles
 * the production zone geometry. This script seeds lightweight dev data
 * without requiring GIS shape files.
 */

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL env var is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

// Simple HMAC password hash (mirrors auth.service.ts — dev use only)
import crypto from 'crypto';
function hashPassword(password: string): string {
  const salt = process.env.JWT_ACCESS_SECRET ?? 'dengue-salt';
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Seeding development data...\n');

    // ─── Seed zones (simplified — no real GIS geometry) ─────────────────────
    await client.query(`
      INSERT INTO zones (id, name, district, province, risk_score, risk_level, active_report_count)
      VALUES
        ('00000000-0000-0000-0000-000000000001', 'Colombo 3',    'Colombo',  'Western', 45, 'medium', 3),
        ('00000000-0000-0000-0000-000000000002', 'Colombo 7',    'Colombo',  'Western', 72, 'high',   8),
        ('00000000-0000-0000-0000-000000000003', 'Kelaniya',     'Gampaha',  'Western', 30, 'low',    1),
        ('00000000-0000-0000-0000-000000000004', 'Negombo',      'Gampaha',  'Western', 85, 'critical', 12),
        ('00000000-0000-0000-0000-000000000005', 'Dehiwala',     'Colombo',  'Western', 55, 'medium', 5)
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('✅ Zones seeded');

    // ─── Seed staff users ────────────────────────────────────────────────────
    await client.query(
      `INSERT INTO users (id, email, password_hash, full_name, role, language_preference)
       VALUES
         ('00000000-0000-0000-0001-000000000001', 'admin@dengueguard.lk',   $1, 'NDCU Admin',       'ndcu_admin',     'en'),
         ('00000000-0000-0000-0001-000000000002', 'phi@dengueguard.lk',     $2, 'PHI Officer',      'phi',            'si'),
         ('00000000-0000-0000-0001-000000000003', 'drone@dengueguard.lk',   $3, 'Drone Operator 1', 'drone_operator', 'en')
       ON CONFLICT (id) DO NOTHING`,
      [hashPassword('Admin@123'), hashPassword('Phi@1234'), hashPassword('Drone@123')],
    );
    console.log('✅ Staff users seeded');
    console.log('\n📋 Dev credentials:');
    console.log('  NDCU Admin:      admin@dengueguard.lk  / Admin@123');
    console.log('  PHI Officer:     phi@dengueguard.lk    / Phi@1234');
    console.log('  Drone Operator:  drone@dengueguard.lk  / Drone@123');
    console.log('\n🎉 Seed complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
