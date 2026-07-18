import { query, transaction } from '../client';

export interface CreateTrapInput {
  serial_number: string;
  latitude: number;
  longitude: number;
  zone_id?: string;
  district: string;
  status: 'active' | 'offline' | 'maintenance';
  battery_percent?: number;
}

export interface AddTrapReadingInput {
  trap_id: string;
  mosquito_count_24h: number;
  mosquito_count_7d: number;
  species_detected: string[];
  larvae_detected: boolean;
  water_temp_c: number;
  humidity_percent: number;
  trap_fill_percent: number;
}

export async function createTrap(input: CreateTrapInput) {
  const { serial_number, latitude, longitude, zone_id, district, status, battery_percent } = input;
  const result = await query(
    `INSERT INTO iot_traps (
       serial_number, location, latitude, longitude, zone_id, district, status, battery_percent
     ) VALUES (
       $1, ST_SetSRID(ST_MakePoint($3, $2), 4326), $2, $3, $4, $5, $6, $7
     ) RETURNING *`,
    [serial_number, latitude, longitude, zone_id || null, district, status, battery_percent ?? 100]
  );
  return result.rows[0];
}

export async function listTraps(filters: {
  zone_id?: string;
  status?: string;
}) {
  const { zone_id, status } = filters;
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIdx = 1;

  if (zone_id) {
    conditions.push(`t.zone_id = $${paramIdx++}`);
    params.push(zone_id);
  }
  if (status) {
    conditions.push(`t.status = $${paramIdx++}`);
    params.push(status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const queryText = `
    SELECT t.*,
           ST_X(t.location) AS lng,
           ST_Y(t.location) AS lat,
           z.name AS zone_name,
           r.mosquito_count_24h,
           r.mosquito_count_7d,
           r.species_detected,
           r.larvae_detected,
           r.water_temp_c,
           r.humidity_percent,
           r.trap_fill_percent
    FROM iot_traps t
    LEFT JOIN zones z ON t.zone_id = z.id
    LEFT JOIN LATERAL (
      SELECT * FROM trap_readings
      WHERE trap_id = t.id
      ORDER BY created_at DESC
      LIMIT 1
    ) r ON true
    ${whereClause}
    ORDER BY t.serial_number ASC
  `;

  const result = await query(queryText, params);
  
  // Format to match Trap interface in frontend
  return result.rows.map((row: any) => ({
    trap_id: row.id,
    serial_number: row.serial_number,
    lat: row.lat,
    lng: row.lng,
    zone_id: row.zone_id,
    zone_name: row.zone_name,
    district: row.district,
    status: row.status,
    battery_percent: row.battery_percent,
    last_sync_at: row.last_sync_at,
    installed_at: row.installed_at,
    readings: {
      mosquito_count_24h: row.mosquito_count_24h ?? 0,
      mosquito_count_7d: row.mosquito_count_7d ?? 0,
      species_detected: row.species_detected ?? [],
      larvae_detected: row.larvae_detected ?? false,
      water_temp_c: row.water_temp_c ?? 25.0,
      humidity_percent: row.humidity_percent ?? 70.0,
      trap_fill_percent: row.trap_fill_percent ?? 10.0,
    }
  }));
}

export async function getTrapById(id: string) {
  const queryText = `
    SELECT t.*,
           ST_X(t.location) AS lng,
           ST_Y(t.location) AS lat,
           z.name AS zone_name,
           r.mosquito_count_24h,
           r.mosquito_count_7d,
           r.species_detected,
           r.larvae_detected,
           r.water_temp_c,
           r.humidity_percent,
           r.trap_fill_percent
    FROM iot_traps t
    LEFT JOIN zones z ON t.zone_id = z.id
    LEFT JOIN LATERAL (
      SELECT * FROM trap_readings
      WHERE trap_id = t.id
      ORDER BY created_at DESC
      LIMIT 1
    ) r ON true
    WHERE t.id = $1
  `;
  const result = await query(queryText, [id]);
  const row = result.rows[0] as any;
  if (!row) return null;

  return {
    trap_id: row.id,
    serial_number: row.serial_number,
    lat: row.lat,
    lng: row.lng,
    zone_id: row.zone_id,
    zone_name: row.zone_name,
    district: row.district,
    status: row.status,
    battery_percent: row.battery_percent,
    last_sync_at: row.last_sync_at,
    installed_at: row.installed_at,
    readings: {
      mosquito_count_24h: row.mosquito_count_24h ?? 0,
      mosquito_count_7d: row.mosquito_count_7d ?? 0,
      species_detected: row.species_detected ?? [],
      larvae_detected: row.larvae_detected ?? false,
      water_temp_c: row.water_temp_c ?? 25.0,
      humidity_percent: row.humidity_percent ?? 70.0,
      trap_fill_percent: row.trap_fill_percent ?? 10.0,
    }
  };
}

export async function addTrapReading(input: AddTrapReadingInput) {
  const {
    trap_id, mosquito_count_24h, mosquito_count_7d, species_detected,
    larvae_detected, water_temp_c, humidity_percent, trap_fill_percent
  } = input;

  return transaction(async (client) => {
    const result = await client.query(
      `INSERT INTO trap_readings (
         trap_id, mosquito_count_24h, mosquito_count_7d, species_detected,
         larvae_detected, water_temp_c, humidity_percent, trap_fill_percent
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8
       ) RETURNING *`,
      [trap_id, mosquito_count_24h, mosquito_count_7d, species_detected,
       larvae_detected, water_temp_c, humidity_percent, trap_fill_percent]
    );

    // Update last_sync_at on the trap
    await client.query(
      `UPDATE iot_traps SET last_sync_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [trap_id]
    );

    return result.rows[0];
  });
}

export async function getTrapReadings(trapId: string, days: number = 7) {
  const result = await query(
    `SELECT *, created_at AS timestamp
     FROM trap_readings
     WHERE trap_id = $1 AND created_at >= NOW() - INTERVAL '1 day' * $2
     ORDER BY created_at ASC`,
    [trapId, days]
  );
  return result.rows;
}
