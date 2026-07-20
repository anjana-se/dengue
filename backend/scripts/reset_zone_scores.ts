import { pool } from '../src/db/client';

async function main() {
  const res = await pool.query(
    `UPDATE zones
     SET risk_score = 0, risk_level = 'low', active_report_count = 0`
  );
  console.log('✅ Successfully reset all zone risk scores. Count:', res.rowCount);
  await pool.end();
}

main().catch((err) => {
  console.error('Error resetting zone scores:', err);
  process.exit(1);
});
