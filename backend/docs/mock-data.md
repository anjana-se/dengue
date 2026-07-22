# Loading Mock Data (IoT traps, dengue cases, outbreak forecast)

This guide explains how to load **synthetic** demo data into the database so the
NDCU dashboard's operational layers render **and** the DengueGuard AI assistant can
answer questions about them.

> ⚠️ **Compliance / PDPA.** All data produced here is 100% synthetic — invented
> case IDs, hospitals, age groups, and coordinates. **Never** load real patient
> data through this path without qualified legal/compliance review. The dengue
> `cases` table holds health/PII-adjacent fields; the AI assistant is deliberately
> restricted to *aggregate* case counts and must stay that way.

## What gets seeded

| Layer | Table(s) | Rows | AI tool that reads it |
|---|---|---|---|
| Surveillance zones | `zones` | 8 (fixed Colombo GN divisions) | `list_zones`, `get_zone_report_stats` |
| IoT trap network | `iot_traps` + `trap_readings` | ~40 traps + 40 readings | `list_traps` |
| Dengue cases | `cases` | ~140 (last ~45 days) | `get_case_summary` (aggregate only) |
| Outbreak forecast | `forecasts` | 8 (one 14-day forecast per zone) | `get_outbreak_forecast` |

The 8 zones use the **same fixed UUIDs** as the ndcu frontend
(`ndcu/src/data/zones.ts`), so map polygons, traps, cases, and forecasts all line up.
IoT traps and dengue cases already had backend tables/queries/routes/AI-tools — they
were simply never seeded. The `forecasts` table + `get_outbreak_forecast` AI tool are
new (added in migration `015_create_forecasts.sql`).

## Prerequisites

From the `backend/` directory:

```powershell
docker compose up -d      # Postgres (PostGIS) + Redis
npm install
```

A valid `DATABASE_URL` must be set in `backend/.env` (see `.env.example`).

## Steps

Run these in order from `backend/`:

```powershell
npm run migrate     # 1. apply schema, incl. 015_create_forecasts.sql
npm run seed        # 2. staff user accounts (unchanged)
npm run seed:mock   # 3. zones + traps + cases + forecasts (this feature)
```

`npm run seed:mock` is **idempotent** — safe to re-run:
- `zones` are **upserted** by their fixed UUID (`ON CONFLICT DO UPDATE`) so geometry
  and risk are (re)applied even if placeholder rows already exist. Only the 8 fixed
  demo UUIDs are touched — real, dynamically-created zones are never modified.
- `forecasts` use a fixed per-zone key + `ON CONFLICT DO NOTHING`.
- `iot_traps`/`cases` are **skipped entirely** if their tables already contain rows
  (their child/serial rows have no natural upsert key). You'll see
  `⏭️  … already present — skipping.`
- Case→zone spatial linking runs every time (harmless re-resolve).

## Verify

**Database** — spot-check row counts:

```powershell
docker compose exec -T db psql -U postgres -d dengueguard -c "SELECT (SELECT count(*) FROM zones) zones, (SELECT count(*) FROM iot_traps) traps, (SELECT count(*) FROM trap_readings) readings, (SELECT count(*) FROM cases) cases, (SELECT count(*) FROM forecasts) forecasts;"
```

(Adjust the psql user/db name to match your `DATABASE_URL`.)

**Dashboard** — start the API + worker and the ndcu app:

```powershell
npm run dev:api      # terminal 1
npm run dev:worker   # terminal 2
cd ../ndcu; npm run dev   # terminal 3 → http://localhost:5173
```

Log in as `admin@dengueguard.lk / Admin@123`, then on the dashboard toggle the
**Case layer** and **IoT traps** buttons — the map markers and the `CaseStats` /
`IotStats` cards should populate.

**AI assistant** — open the Assistant panel and try:
- *"How many IoT traps are offline?"* → exercises `list_traps`
- *"Give me a dengue case summary by severity."* → `get_case_summary`
- *"What's the 14-day outbreak forecast — which zones are at emergency level?"* →
  the new `get_outbreak_forecast`

## Re-seeding from scratch

To wipe just the mock data and re-seed (destructive — synthetic data only):

```powershell
docker compose exec -T db psql -U postgres -d dengueguard -c "TRUNCATE forecasts, trap_readings, iot_traps, cases RESTART IDENTITY;"
npm run seed:mock
```

Zones are referenced by other tables (reports, work orders); if you also need to
clear zones, use the existing `npm run clear:zones` / `npm run reset:all` scripts,
which handle those dependencies.

## Tuning the volume / distribution

Edit `backend/scripts/seedMockData.ts`:
- `seedTraps` — trap count (currently 40) and the active/offline/maintenance split.
- `seedCases` — `const N = 140` and the severity/age/`daysAgo` distributions.
- `seedForecasts` — the per-zone `TUNE` table (`[probability, trend, alert_level]`).
- `ZONES` — the 8 zones' geometry and `risk_score` / `risk_level`.

The distributions mirror the frontend generators in `ndcu/src/data/traps.ts`,
`ndcu/src/data/mock.ts`, and `ndcu/src/data/zones.ts`.
