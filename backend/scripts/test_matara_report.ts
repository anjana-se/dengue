import { pool } from '../src/db/client';
import { createReportService } from '../src/services/reports/reports.service';
import { findZoneById } from '../src/db/queries/zones.queries';
import path from 'path';
import fs from 'fs';

async function testMataraReport() {
  console.log('🧪 Testing community report in Matara area (5.948, 80.535)...');

  const tmpImg = path.join(__dirname, 'test_matara.jpg');
  if (!fs.existsSync(tmpImg)) {
    fs.writeFileSync(tmpImg, 'fake-jpeg-data');
  }

  // Create staff user or get existing user ID to satisfy foreign key
  const userRes = await pool.query(`SELECT id FROM users LIMIT 1`);
  const userId = userRes.rows[0]?.id;

  // Submit community report in Matara
  const report = await createReportService({
    filePath: tmpImg,
    mimeType: 'image/jpeg',
    sourceType: 'community',
    reporterId: userId,
    latitude: 5.948,
    longitude: 80.535,
    language: 'en',
    notes: 'Matara community report — breeding site found',
  });

  console.log('✅ Matara Report Created:', {
    id: report.id,
    zone_id: report.zone_id,
    lat: report.latitude,
    lng: report.longitude,
  });

  if (report.zone_id) {
    const zone = await findZoneById(report.zone_id);
    console.log('🎯 Matara Zone Data Fetched From DB:', {
      id: zone?.id,
      name: zone?.name,
      district: zone?.district,
      province: zone?.province,
      risk_score: zone?.risk_score,
      risk_level: zone?.risk_level,
      has_geom_json: Boolean(zone?.geom_json),
      lat: zone?.lat,
      lng: zone?.lng,
    });
  }

  if (fs.existsSync(tmpImg)) fs.unlinkSync(tmpImg);
  await pool.end();
}

testMataraReport().catch((err) => {
  console.error('❌ Matara test error:', err);
  process.exit(1);
});
