import 'dotenv/config';
import { createClient } from 'redis';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

/**
 * scripts/validate.ts
 *
 * Fully automated API validation script.
 * 1. Authenticates as different roles.
 * 2. Retrieves/verifies OTP via Redis.
 * 3. Tests core CRUD & business logic flows.
 * 4. Outputs results to console.
 */

const BASE_URL = 'http://localhost:3000/api/v1';

async function log(stepName: string, success: boolean, info: any = '') {
  const status = success ? '✅ PASS' : '❌ FAIL';
  console.log(`[${status}] ${stepName}`);
  if (info) {
    console.log(JSON.stringify(info, null, 2));
  }
}

async function run() {
  console.log('🏁 Starting API validation tests...\n');

  let adminToken = '';
  let phiToken = '';
  let droneToken = '';
  let reporterToken = '';
  
  let createdReportId = '';
  let createdMissionId = '';
  let createdWorkOrderId = '';
  let createdChatSessionId = '';
  let zoneId = '';

  // 1. POST /auth/login - Admin Login
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@dengueguard.lk', password: 'Admin@123' })
    });
    const data: any = await res.json();
    if (res.status === 200 && data.success && data.data?.access_token) {
      adminToken = data.data.access_token;
      await log('Staff Login: admin@dengueguard.lk', true);
    } else {
      await log('Staff Login: admin@dengueguard.lk', false, data);
    }
  } catch (err: any) {
    await log('Staff Login: admin@dengueguard.lk', false, err.message);
  }

  // 2. POST /auth/login - PHI Login
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'phi@dengueguard.lk', password: 'Phi@1234' })
    });
    const data: any = await res.json();
    if (res.status === 200 && data.success && data.data?.access_token) {
      phiToken = data.data.access_token;
      await log('Staff Login: phi@dengueguard.lk', true);
    } else {
      await log('Staff Login: phi@dengueguard.lk', false, data);
    }
  } catch (err: any) {
    await log('Staff Login: phi@dengueguard.lk', false, err.message);
  }

  // 3. POST /auth/login - Drone Operator Login
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'drone@dengueguard.lk', password: 'Drone@123' })
    });
    const data: any = await res.json();
    if (res.status === 200 && data.success && data.data?.access_token) {
      droneToken = data.data.access_token;
      await log('Staff Login: drone@dengueguard.lk', true);
    } else {
      await log('Staff Login: drone@dengueguard.lk', false, data);
    }
  } catch (err: any) {
    await log('Staff Login: drone@dengueguard.lk', false, err.message);
  }

  // 4. GET /auth/me - Profile Verification
  if (adminToken) {
    try {
      const res = await fetch(`${BASE_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const data: any = await res.json();
      if (res.status === 200 && data.success && data.data?.user?.email === 'admin@dengueguard.lk') {
        await log('Get Current User Profile (/auth/me)', true);
      } else {
        await log('Get Current User Profile (/auth/me)', false, data);
      }
    } catch (err: any) {
      await log('Get Current User Profile (/auth/me)', false, err.message);
    }
  }

  // 5. POST /auth/otp/request & verify - Email OTP flow
  // Use the verified Resend test recipient email address to make the API key accept it.
  const testEmail = 'anjanarefe@gmail.com';
  let redisClient: any = null;
  try {
    // Request OTP
    const reqRes = await fetch(`${BASE_URL}/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, full_name: 'API Tester' })
    });
    const reqData: any = await reqRes.json();

    if (reqRes.status === 200) {
      await log('Request OTP via Email (/auth/otp/request)', true);

      // Connect to Redis to read the hashed code or stub code
      const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
      redisClient = createClient({ url: redisUrl });
      await redisClient.connect();

      // Retrieve the hashed code key
      const key = `otp:${testEmail}`;
      const storedHash = await redisClient.get(key);
      console.log('Stored OTP hash in Redis:', storedHash);

      // Set a known hash so we can bypass the code validation
      const knownCode = '123456';
      const knownHash = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92'; // SHA256 of '123456'
      await redisClient.setEx(key, 300, knownHash);
      const readBack = await redisClient.get(key);
      console.log('Read back hash from Redis:', readBack);

      // Verify OTP
      const verRes = await fetch(`${BASE_URL}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, code: knownCode })
      });
      const verData: any = await verRes.json();
      if (verRes.status === 200 && verData.success && verData.data?.access_token) {
        reporterToken = verData.data.access_token;
        await log('Verify Email OTP and Login (/auth/otp/verify)', true);
      } else {
        await log('Verify Email OTP and Login (/auth/otp/verify)', false, verData);
      }
    } else {
      await log('Request OTP via Email (/auth/otp/request)', false, reqData);
    }
  } catch (err: any) {
    await log('Email OTP Request/Verify Flow', false, err.message);
  } finally {
    if (redisClient) {
      await redisClient.quit();
    }
  }

  // 6. GET /zones - Retrieve Territorial Zones
  if (adminToken) {
    try {
      const res = await fetch(`${BASE_URL}/zones`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const data: any = await res.json();
      if (res.status === 200 && data.success && Array.isArray(data.data) && data.data.length > 0) {
        zoneId = data.data[0].id;
        await log('Get All Territorial Zones (/zones)', true);
      } else {
        await log('Get All Territorial Zones (/zones)', false, data);
      }
    } catch (err: any) {
      await log('Get All Territorial Zones (/zones)', false, err.message);
    }
  }

  // 7. GET /zones/:id - Get Single Zone detail
  if (adminToken && zoneId) {
    try {
      const res = await fetch(`${BASE_URL}/zones/${zoneId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const data: any = await res.json();
      if (res.status === 200 && data.success && data.data) {
        await log('Get Specific Zone Details (/zones/:id)', true);
      } else {
        await log('Get Specific Zone Details (/zones/:id)', false, data);
      }
    } catch (err: any) {
      await log('Get Specific Zone Details (/zones/:id)', false, err.message);
    }
  }

  // 8. POST /reports - Submit a breeding site report (requires multipart image)
  if (reporterToken) {
    try {
      // Create a dummy image file for upload
      const dummyFilePath = path.join(__dirname, 'dummy.jpg');
      const jpegBuffer = Buffer.from(
        'ffd8ffe000104a46494600010101006000600000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffc0000b080001000101011100ffc4001f0000010501110101010100000000000000000102030405060708090a0bffc400b5100002010303020403050504040000017d0102030405111206132131410714225181326191a1082342b1c11552d1f02433627282090a161718191a25262728292a3435363738393a434445464748494a535455565758595a636465666768696a737475767778797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9faffda000c03010002110311003f00ffd9',
        'hex'
      );
      fs.writeFileSync(dummyFilePath, jpegBuffer);

      const formData = new FormData();
      formData.append('image', new Blob([fs.readFileSync(dummyFilePath)], { type: 'image/jpeg' }), 'dummy.jpg');
      formData.append('lat', '6.9271');
      formData.append('lng', '79.8612');
      formData.append('source_type', 'community');
      formData.append('description', 'Stagnant water found near school');

      const res = await fetch(`${BASE_URL}/reports`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${reporterToken}`
        },
        body: formData
      });
      const data: any = await res.json();
      if (res.status === 202 && data.success && data.data?.report_id) {
        createdReportId = data.data.report_id;
        await log('Submit Incident Report (/reports)', true);
      } else {
        await log('Submit Incident Report (/reports)', false, data);
      }

      // Cleanup dummy file
      fs.unlinkSync(dummyFilePath);
    } catch (err: any) {
      await log('Submit Incident Report (/reports)', false, err.message);
    }
  }

  // 9. GET /reports - List reports
  if (phiToken) {
    try {
      const res = await fetch(`${BASE_URL}/reports`, {
        headers: { 'Authorization': `Bearer ${phiToken}` }
      });
      const data: any = await res.json();
      if (res.status === 200 && data.success && data.data && Array.isArray(data.data.data)) {
        await log('List Incident Reports (/reports)', true);
      } else {
        await log('List Incident Reports (/reports)', false, data);
      }
    } catch (err: any) {
      await log('List Incident Reports (/reports)', false, err.message);
    }
  }

  // 10. GET /reports/:id - Get specific report details
  if (phiToken && createdReportId) {
    try {
      const res = await fetch(`${BASE_URL}/reports/${createdReportId}`, {
        headers: { 'Authorization': `Bearer ${phiToken}` }
      });
      const data: any = await res.json();
      if (res.status === 200 && data.success) {
        await log('Get Report Details (/reports/:id)', true);
      } else {
        await log('Get Report Details (/reports/:id)', false, data);
      }
    } catch (err: any) {
      await log('Get Report Details (/reports/:id)', false, err.message);
    }
  }

  // 11. PATCH /reports/:id/review - PHI review submission
  if (phiToken && createdReportId) {
    try {
      // Force update status in database so PHI review can succeed instantly without waiting for async background worker
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      await pool.query("UPDATE reports SET status = 'needs_human_review' WHERE id = $1", [createdReportId]);
      await pool.end();

      const res = await fetch(`${BASE_URL}/reports/${createdReportId}/review`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${phiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ outcome: 'confirmed', notes: 'Verified on-site by PHI' })
      });
      const data: any = await res.json();
      if (res.status === 200 && data.success) {
        await log('PHI Submit Report Review (/reports/:id/review)', true);
      } else {
        await log('PHI Submit Report Review (/reports/:id/review)', false, data);
      }
    } catch (err: any) {
      await log('PHI Submit Report Review (/reports/:id/review)', false, err.message);
    }
  }

  // 12. GET /workorders - List work orders
  if (phiToken) {
    try {
      const res = await fetch(`${BASE_URL}/workorders`, {
        headers: { 'Authorization': `Bearer ${phiToken}` }
      });
      const data: any = await res.json();
      if (res.status === 200 && data.success && data.data?.data) {
        await log('List Work Orders (/workorders)', true);
      } else {
        await log('List Work Orders (/workorders)', false, data);
      }
    } catch (err: any) {
      await log('List Work Orders (/workorders)', false, err.message);
    }
  }

  // 13. POST /workorders - Manually create a work order (NDCU Admin only)
  if (adminToken && createdReportId) {
    try {
      const res = await fetch(`${BASE_URL}/workorders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          report_id: createdReportId,
          description: 'Urgent mosquito breeding site intervention required.',
          ndcu_instructions: 'Treat with larvicide.'
        })
      });
      const data: any = await res.json();
      if (res.status === 201 && data.success) {
        createdWorkOrderId = data.data.id;
        await log('Manually Create Work Order (/workorders)', true);
      } else {
        await log('Manually Create Work Order (/workorders)', false, data);
      }
    } catch (err: any) {
      await log('Manually Create Work Order (/workorders)', false, err.message);
    }
  }

  // 14. GET /workorders/:id - Get specific work order detail
  if (adminToken && createdWorkOrderId) {
    try {
      const res = await fetch(`${BASE_URL}/workorders/${createdWorkOrderId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const data: any = await res.json();
      if (res.status === 200 && data.success) {
        await log('Get Specific Work Order Detail (/workorders/:id)', true);
      } else {
        await log('Get Specific Work Order Detail (/workorders/:id)', false, data);
      }
    } catch (err: any) {
      await log('Get Specific Work Order Detail (/workorders/:id)', false, err.message);
    }
  }

  // 15. PATCH /workorders/:id/accept - PHI accept work order
  if (phiToken && createdWorkOrderId) {
    try {
      const res = await fetch(`${BASE_URL}/workorders/${createdWorkOrderId}/accept`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${phiToken}` }
      });
      const data: any = await res.json();
      if (res.status === 200 && data.success) {
        await log('PHI Accept Work Order (/workorders/:id/accept)', true);
      } else {
        await log('PHI Accept Work Order (/workorders/:id/accept)', false, data);
      }
    } catch (err: any) {
      await log('PHI Accept Work Order (/workorders/:id/accept)', false, err.message);
    }
  }

  // 16. PATCH /workorders/:id/resolve - PHI resolve work order
  if (phiToken && createdWorkOrderId) {
    try {
      const formData = new FormData();
      formData.append('resolution_notes', 'Sprayed and drained successfully by PHI team.');
      formData.append('verified_risk_level', 'low');

      const res = await fetch(`${BASE_URL}/workorders/${createdWorkOrderId}/resolve`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${phiToken}` },
        body: formData
      });
      const data: any = await res.json();
      if (res.status === 200 && data.success) {
        await log('PHI Resolve Work Order (/workorders/:id/resolve)', true);
      } else {
        await log('PHI Resolve Work Order (/workorders/:id/resolve)', false, data);
      }
    } catch (err: any) {
      await log('PHI Resolve Work Order (/workorders/:id/resolve)', false, err.message);
    }
  }

  // 17. GET /zones/:id/reports - List zone reports
  if (phiToken && zoneId) {
    try {
      const res = await fetch(`${BASE_URL}/zones/${zoneId}/reports`, {
        headers: { 'Authorization': `Bearer ${phiToken}` }
      });
      const data: any = await res.json();
      if (res.status === 200 && data.success) {
        await log('List Reports in Zone (/zones/:id/reports)', true);
      } else {
        await log('List Reports in Zone (/zones/:id/reports)', false, data);
      }
    } catch (err: any) {
      await log('List Reports in Zone (/zones/:id/reports)', false, err.message);
    }
  }

  // 18. POST /drone/missions - Create drone survey mission
  if (droneToken) {
    try {
      const res = await fetch(`${BASE_URL}/drone/missions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${droneToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: 'Colombo South Survey' })
      });
      const data: any = await res.json();
      if (res.status === 201 && data.success && data.data?.id) {
        createdMissionId = data.data.id;
        await log('Create Drone Mission (/drone/missions)', true);
      } else {
        await log('Create Drone Mission (/drone/missions)', false, data);
      }
    } catch (err: any) {
      await log('Create Drone Mission (/drone/missions)', false, err.message);
    }
  }

  // 19. PATCH /drone/missions/:id/status - Update drone mission status
  if (droneToken && createdMissionId) {
    try {
      const res = await fetch(`${BASE_URL}/drone/missions/${createdMissionId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${droneToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'in_progress' })
      });
      const data: any = await res.json();
      if (res.status === 200 && data.success) {
        await log('Update Drone Mission Status (/drone/missions/:id/status)', true);
      } else {
        await log('Update Drone Mission Status (/drone/missions/:id/status)', false, data);
      }
    } catch (err: any) {
      await log('Update Drone Mission Status (/drone/missions/:id/status)', false, err.message);
    }
  }

  // 20. POST /drone/missions/:id/frames - Upload drone frames
  if (droneToken && createdMissionId) {
    try {
      const dummyFramePath = path.join(__dirname, 'dummy_frame.jpg');
      const jpegBuffer = Buffer.from(
        'ffd8ffe000104a46494600010101006000600000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffc0000b080001000101011100ffc4001f0000010501110101010100000000000000000102030405060708090a0bffc400b5100002010303020403050504040000017d0102030405111206132131410714225181326191a1082342b1c11552d1f02433627282090a161718191a25262728292a3435363738393a434445464748494a535455565758595a636465666768696a737475767778797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9faffda000c03010002110311003f00ffd9',
        'hex'
      );
      fs.writeFileSync(dummyFramePath, jpegBuffer);

      const formData = new FormData();
      formData.append('image', new Blob([fs.readFileSync(dummyFramePath)], { type: 'image/jpeg' }), 'dummy_frame.jpg');
      formData.append('lat', '6.9271');
      formData.append('lng', '79.8612');

      const res = await fetch(`${BASE_URL}/drone/missions/${createdMissionId}/frames`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${droneToken}` },
        body: formData
      });
      const data: any = await res.json();
      if ((res.status === 200 || res.status === 201 || res.status === 202) && data.success) {
        await log('Upload Drone Telemetry Frame (/drone/missions/:id/frames)', true);
      } else {
        await log('Upload Drone Telemetry Frame (/drone/missions/:id/frames)', false, data);
      }

      fs.unlinkSync(dummyFramePath);
    } catch (err: any) {
      await log('Upload Drone Telemetry Frame (/drone/missions/:id/frames)', false, err.message);
    }
  }

  // 21. GET /drone/missions/:id - Get specific drone mission details
  if (droneToken && createdMissionId) {
    try {
      const res = await fetch(`${BASE_URL}/drone/missions/${createdMissionId}`, {
        headers: { 'Authorization': `Bearer ${droneToken}` }
      });
      const data: any = await res.json();
      if (res.status === 200 && data.success) {
        await log('Get Drone Mission Details (/drone/missions/:id)', true);
      } else {
        await log('Get Drone Mission Details (/drone/missions/:id)', false, data);
      }
    } catch (err: any) {
      await log('Get Drone Mission Details (/drone/missions/:id)', false, err.message);
    }
  }

  // 22. GET /drone/missions - List missions
  if (droneToken) {
    try {
      const res = await fetch(`${BASE_URL}/drone/missions`, {
        headers: { 'Authorization': `Bearer ${droneToken}` }
      });
      const data: any = await res.json();
      if (res.status === 200 && data.success) {
        await log('List Drone Missions (/drone/missions)', true);
      } else {
        await log('List Drone Missions (/drone/missions)', false, data);
      }
    } catch (err: any) {
      await log('List Drone Missions (/drone/missions)', false, err.message);
    }
  }

  // 23. GET /dashboard/summary - KPI summary dashboard
  if (adminToken) {
    try {
      const res = await fetch(`${BASE_URL}/dashboard/summary`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const data: any = await res.json();
      if (res.status === 200 && data.success) {
        await log('Get Dashboard Aggregated KPIs (/dashboard/summary)', true);
      } else {
        await log('Get Dashboard Aggregated KPIs (/dashboard/summary)', false, data);
      }
    } catch (err: any) {
      await log('Get Dashboard Aggregated KPIs (/dashboard/summary)', false, err.message);
    }
  }

  // 24. GET /dashboard/export - CSV Export of Reports (NDCU Admin only)
  if (adminToken) {
    try {
      const res = await fetch(`${BASE_URL}/dashboard/export`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (res.status === 200) {
        await log('Download CSV Report Export (/dashboard/export)', true);
      } else {
        await log('Download CSV Report Export (/dashboard/export)', false, res.status);
      }
    } catch (err: any) {
      await log('Download CSV Report Export (/dashboard/export)', false, err.message);
    }
  }

  // 25. POST /chat/message - Send assistant prompt
  if (phiToken) {
    try {
      const res = await fetch(`${BASE_URL}/chat/message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${phiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: 'What is the risk level in zone Colombo 3?' })
      });
      const data: any = await res.json();
      if (res.status === 200 && data.success) {
        createdChatSessionId = data.data.session_id;
        await log('Send Chat Message to AI Assistant (/chat/message)', true);
      } else {
        await log('Send Chat Message to AI Assistant (/chat/message)', false, data);
      }
    } catch (err: any) {
      await log('Send Chat Message to AI Assistant (/chat/message)', false, err.message);
    }
  }

  // 26. GET /chat/sessions - List active sessions
  if (phiToken) {
    try {
      const res = await fetch(`${BASE_URL}/chat/sessions`, {
        headers: { 'Authorization': `Bearer ${phiToken}` }
      });
      const data: any = await res.json();
      if (res.status === 200 && data.success) {
        await log('List User Assistant Chat Sessions (/chat/sessions)', true);
      } else {
        await log('List User Assistant Chat Sessions (/chat/sessions)', false, data);
      }
    } catch (err: any) {
      await log('List User Assistant Chat Sessions (/chat/sessions)', false, err.message);
    }
  }

  // 27. GET /chat/sessions/:id - Get session dialogue thread
  if (phiToken && createdChatSessionId) {
    try {
      const res = await fetch(`${BASE_URL}/chat/sessions/${createdChatSessionId}`, {
        headers: { 'Authorization': `Bearer ${phiToken}` }
      });
      const data: any = await res.json();
      if (res.status === 200 && data.success) {
        await log('Fetch Chat Dialogue History (/chat/sessions/:id)', true);
      } else {
        await log('Fetch Chat Dialogue History (/chat/sessions/:id)', false, data);
      }
    } catch (err: any) {
      await log('Fetch Chat Dialogue History (/chat/sessions/:id)', false, err.message);
    }
  }

  console.log('\n🏁 API Validation complete.');
}

run();
