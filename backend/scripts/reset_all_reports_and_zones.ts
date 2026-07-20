import { pool } from '../src/db/client';

async function resetAll() {
  console.log('🔄 Starting complete reset of all reports, zones, and related data...');
  
  // 1. Delete all dependent records first (respecting FK constraints)
  await pool.query(`TRUNCATE TABLE work_orders CASCADE`);
  await pool.query(`TRUNCATE TABLE duplicate_decisions CASCADE`);
  await pool.query(`TRUNCATE TABLE incidents CASCADE`);
  await pool.query(`TRUNCATE TABLE reports CASCADE`);
  await pool.query(`TRUNCATE TABLE drone_image_reports CASCADE`);
  await pool.query(`TRUNCATE TABLE drone_missions CASCADE`);

  console.log('✅ Cleared reports, work orders, incidents, and drone missions');

  // 2. Clear assigned_zone_id from users before truncating zones
  await pool.query(`UPDATE users SET assigned_zone_id = NULL WHERE assigned_zone_id IS NOT NULL`);

  // 3. Delete ALL zones (they will be recreated dynamically from reports)
  const res = await pool.query(`DELETE FROM zones`);
  console.log(`✅ Deleted ${res.rowCount} zones — zones will be created dynamically when reports come in`);

  await pool.end();
}

resetAll().catch((err) => {
  console.error('❌ Reset failed:', err);
  process.exit(1);
});
