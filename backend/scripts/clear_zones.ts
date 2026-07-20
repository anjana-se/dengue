import { pool } from '../src/db/client';

/**
 * scripts/clear_zones.ts — Wipes all zones data from PostgreSQL database.
 * Run via: npx ts-node scripts/clear_zones.ts or npm run clear:zones
 */

async function clearZones() {
  console.log('🗑️  Clearing all zones from database...');

  // Nullify foreign keys in dependent tables if necessary before truncating zones
  await pool.query(`UPDATE users SET assigned_zone_id = NULL WHERE assigned_zone_id IS NOT NULL`);
  await pool.query(`UPDATE reports SET zone_id = NULL WHERE zone_id IS NOT NULL`);
  
  // Truncate zones table
  await pool.query(`TRUNCATE TABLE zones CASCADE`);

  console.log('✅ All database zones data cleared successfully.');
  await pool.end();
}

clearZones().catch((err) => {
  console.error('❌ Failed to clear zones:', err);
  process.exit(1);
});
