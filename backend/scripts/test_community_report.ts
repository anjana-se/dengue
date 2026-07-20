import { pool } from '../src/db/client';
import { createReportService } from '../src/services/reports/reports.service';
import path from 'path';
import fs from 'fs';

async function testCommunityReport() {
  console.log('🧪 Testing real community report submission & zone risk calculation...');

  // Create dummy image file for test
  const tmpImg = path.join(__dirname, 'test_sample.jpg');
  if (!fs.existsSync(tmpImg)) {
    fs.writeFileSync(tmpImg, 'fake-jpeg-data');
  }

  // Submit community report in Colombo Fort area (6.935, 79.848)
  const report = await createReportService({
    filePath: tmpImg,
    mimeType: 'image/jpeg',
    sourceType: 'community',
    latitude: 6.935,
    longitude: 79.848,
    language: 'en',
    notes: 'Test community dengue report with visible water stagnation',
  });

  console.log('✅ Report Created:', {
    id: report.id,
    zone_id: report.zone_id,
    status: report.status,
    risk_level: report.risk_level,
  });

  if (report.zone_id) {
    const zoneRes = await pool.query(`SELECT id, name, risk_score, risk_level, active_report_count FROM zones WHERE id = $1`, [report.zone_id]);
    console.log('🎯 Zone Updated In Real-Time:', zoneRes.rows[0]);
  }

  // Cleanup temp sample file
  if (fs.existsSync(tmpImg)) fs.unlinkSync(tmpImg);
  await pool.end();
}

testCommunityReport().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
