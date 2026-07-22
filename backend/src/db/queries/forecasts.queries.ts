import { query } from '../client';

/**
 * db/queries/forecasts.queries.ts — Typed SQL functions for the forecasts table.
 *
 * A forecast is a 14-day outbreak prediction per zone. The five contributing
 * factors are stored as flat columns and re-grouped into a nested
 * `contributing_factors` object on read, so the output matches the frontend
 * `Prediction` shape (ndcu/src/types.ts) and the chat assistant's tool result.
 */

export interface CreateForecastInput {
  zone_id?: string;
  zone_name: string;
  forecast_horizon_days?: number;
  outbreak_probability: number;
  risk_trend: 'rising' | 'stable' | 'falling';
  confidence: number;
  breeding_site_density: number;
  recent_case_count: number;
  rainfall_mm_forecast: number;
  temperature_avg_c: number;
  humidity_percent: number;
  recommended_action: string;
  alert_level: 'watch' | 'warning' | 'emergency';
}

export interface ForecastListFilters {
  zone_id?: string;
  alert_level?: string;
  min_probability?: number;
}

function mapForecastRow(row: any) {
  return {
    zone_id: row.zone_id,
    zone_name: row.zone_name,
    prediction_date: row.prediction_date,
    forecast_horizon_days: row.forecast_horizon_days,
    outbreak_probability: row.outbreak_probability,
    risk_trend: row.risk_trend,
    confidence: row.confidence,
    contributing_factors: {
      breeding_site_density: row.breeding_site_density,
      recent_case_count: row.recent_case_count,
      rainfall_mm_forecast: row.rainfall_mm_forecast,
      temperature_avg_c: row.temperature_avg_c,
      humidity_percent: row.humidity_percent,
    },
    recommended_action: row.recommended_action,
    alert_level: row.alert_level,
  };
}

export async function createForecast(input: CreateForecastInput) {
  const {
    zone_id, zone_name, forecast_horizon_days, outbreak_probability, risk_trend,
    confidence, breeding_site_density, recent_case_count, rainfall_mm_forecast,
    temperature_avg_c, humidity_percent, recommended_action, alert_level,
  } = input;

  const result = await query(
    `INSERT INTO forecasts (
       zone_id, zone_name, forecast_horizon_days, outbreak_probability, risk_trend,
       confidence, breeding_site_density, recent_case_count, rainfall_mm_forecast,
       temperature_avg_c, humidity_percent, recommended_action, alert_level
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
     )
     ON CONFLICT (zone_id) DO NOTHING
     RETURNING *`,
    [
      zone_id || null, zone_name, forecast_horizon_days ?? 14, outbreak_probability,
      risk_trend, confidence, breeding_site_density, recent_case_count,
      rainfall_mm_forecast, temperature_avg_c, humidity_percent,
      recommended_action, alert_level,
    ],
  );
  return result.rows[0];
}

export async function listForecasts(filters: ForecastListFilters = {}) {
  const { zone_id, alert_level, min_probability } = filters;
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIdx = 1;

  if (zone_id) {
    conditions.push(`zone_id = $${paramIdx++}`);
    params.push(zone_id);
  }
  if (alert_level) {
    conditions.push(`alert_level = $${paramIdx++}`);
    params.push(alert_level);
  }
  if (typeof min_probability === 'number') {
    conditions.push(`outbreak_probability >= $${paramIdx++}`);
    params.push(min_probability);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query(
    `SELECT * FROM forecasts
     ${whereClause}
     ORDER BY outbreak_probability DESC`,
    params,
  );
  return result.rows.map(mapForecastRow);
}
