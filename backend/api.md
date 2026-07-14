# DengueGuard API Validation Checklist

This document tracks the validation status of each backend API endpoint. Tests were run against the live server using the automated `scripts/validate.ts` validation suite.

---

## 🔑 Authentication Endpoints
- [x] `POST /api/v1/auth/otp/request` — Request OTP code to email (Rate-limited, creates reporter account if first-time)
  - **Status**: **PASS**. Generates a 6-digit verification code, hashes it, stores it in Redis with TTL, and sends via Resend integration.
- [x] `POST /api/v1/auth/otp/verify` — Verify 6-digit OTP code and receive JWT pair
  - **Status**: **PASS**. Validates the OTP against the Redis cache and returns standard auth JWT token.
- [x] `POST /api/v1/auth/login` — Staff password login (PHI / NDCU Admin / Drone Operator)
  - **Status**: **PASS**. Returns authenticated JWTs for staff roles.
- [ ] `POST /api/v1/auth/refresh` — Refresh access/refresh token pair
  - **Status**: *Untested* (Not included in validation script but implemented via standard refresh token rotations).
- [x] `GET /api/v1/auth/me` — Retrieve current authenticated user profile
  - **Status**: **PASS**. Returns current logged-in user profile info.
- [ ] `POST /api/v1/auth/staff/register` — Register a new staff account (NDCU Admin only)
  - **Status**: *Untested* (Restricted to NDCU admins; tested structurally).

## 📋 Reports Endpoints
- [x] `POST /api/v1/reports` — Submit breeding site report (Multipart form-data: image, lat/lng or EXIF GPS metadata)
  - **Status**: **PASS**. Processes multipart upload, falls back gracefully if image header is corrupt, stores reference, and enqueues background worker.
- [x] `GET /api/v1/reports` — Query reports with filters (status, zone_id, risk_level, source_type, dates) and pagination
  - **Status**: **PASS**. Supports rich filtering and standard pagination envelope.
- [x] `GET /api/v1/reports/:id` — Retrieve detailed report analysis and AI breeding potential evaluation
  - **Status**: **PASS**. Returns full report schema, coordinates, and nested AI metadata.
- [x] `PATCH /api/v1/reports/:id/review` — Submit human verification outcome (PHI only; spawns Work Order if confirmed)
  - **Status**: **PASS**. Correctly modifies report status to `complete` or `failed` based on review.

## 🚁 Drone Missions Endpoints
- [x] `POST /api/v1/drone/missions` — Create new drone flight mission (Drone Operator / Admin)
  - **Status**: **PASS**. Successfully inserts a mission with name, planned area, and tracks status.
- [x] `GET /api/v1/drone/missions` — List flight missions
  - **Status**: **PASS**. Standard listing API.
- [x] `GET /api/v1/drone/missions/:id` — Retrieve flight mission status and summarized metrics
  - **Status**: **PASS**. Returns mission coordinates, status, and telemetry count.
- [x] `PATCH /api/v1/drone/missions/:id/status` — Start/stop flight mission status
  - **Status**: **PASS**. Successfully transitions mission status.
- [x] `POST /api/v1/drone/missions/:id/frames` — Upload flight telemetry photo frame with EXIF coordinates
  - **Status**: **PASS**. Resizes drone image (retaining GPS if present) or uses the robust file-copy fallback on corrupt images, inserts frame metadata.

## 🛠️ Work Orders Endpoints
- [x] `GET /api/v1/workorders` — Query tasks with assignment, status, and priority sort
  - **Status**: **PASS**. Correctly filters by role (PHI sees own/unassigned; NDCU sees all).
- [x] `GET /api/v1/workorders/:id` — Get full work order detail containing coordinates, instructions, and follow-up images
  - **Status**: **PASS**. Admin role successfully views details (unassigned and assigned).
- [x] `POST /api/v1/workorders` — Manually spawn work order (NDCU Admin only)
  - **Status**: **PASS**. Creates an open work order linked to an existing report.
- [x] `PATCH /api/v1/workorders/:id/accept` — PHI Officer accepts an open work order task
  - **Status**: **PASS**. Assigns the work order to the accepting PHI officer.
- [x] `PATCH /api/v1/workorders/:id/resolve` — PHI Officer resolves task with outcome notes and follow-up photo
  - **Status**: **PASS**. Successfully updates status to `resolved` and processes resolution notes.

## 🗺️ Territorial Zones Endpoints
- [x] `GET /api/v1/zones` — Query all zones with geometry (GeoJSON) and real-time risk scores
  - **Status**: **PASS**. Correctly returns spatial properties and aggregated risk indicators.
- [x] `GET /api/v1/zones/:id` — Retrieve specific zone metadata
  - **Status**: **PASS**. Returns single zone GeoJSON.
- [x] `GET /api/v1/zones/:id/reports` — List all incident reports associated with a zone
  - **Status**: **PASS**. Returns all reports located inside the zone boundaries.

## 📊 Analytics Dashboard Endpoints
- [x] `GET /api/v1/dashboard/summary` — Aggregate KPIs for executive dashboards (Admins / PHI)
  - **Status**: **PASS**. Returns total reports, active workorders, and density metadata.
- [x] `GET /api/v1/dashboard/export` — Download up to 10k reports in CSV format (NDCU Admin only)
  - **Status**: **PASS**. Serves valid CSV content stream.

## 💬 Conversational Assistant Endpoints
- [ ] `POST /api/v1/chat/message` — Send message to AI assistant with localized context
  - **Status**: **BLOCKED (429)**. Structural implementation is complete and verified, but execution is blocked because the Gemini API key has exceeded its free-tier requests quota.
- [x] `GET /api/v1/chat/sessions` — List user's active session history
  - **Status**: **PASS**. Correctly queries list of active chat sessions.
- [ ] `GET /api/v1/chat/sessions/:id` — Fetch full dialog thread for a session
  - **Status**: *Untested* (Verified structurally).
