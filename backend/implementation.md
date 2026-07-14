# DengueGuard Backend Implementation Summary

This document provides a comprehensive technical overview of the completed DengueGuard backend architecture, covering the scaffolding, database migrations, authentication, storage pipelines, Gemini AI analysis queue, work orders, zones, real-time notifications, drone mission integrations, chat assistant, and executive dashboards.

---

## 🏛️ System Architecture

DengueGuard is built on a decoupled, event-driven architecture using Express, PostgreSQL (with PostGIS), Redis, BullMQ, and Google Generative AI (Gemini).

```mermaid
graph TD
    Client[Web & Mobile Clients]
    API[Express API Process]
    Worker[BullMQ Worker Process]
    DB[(PostgreSQL + PostGIS)]
    Cache[(Redis)]
    Gemini[Google Generative AI]
    S3[S3 / Local Storage]

    Client -- HTTP / WebSockets --> API
    API -- Reads/Writes --> DB
    API -- Session/OTP/Queue --> Cache
    API -- Direct Uploads --> S3
    
    Worker -- Dequeue Jobs --> Cache
    Worker -- Vision / Chat / Translation --> Gemini
    Worker -- Spatial Mapping / Persist Analysis --> DB
    Worker -- Event Broadcast --> Client
```

---

## 📂 Source Code Layout

The project follows a clean, feature-based service architecture:

```
src/
├── ai/
│   └── queue/
│       ├── consumer.ts             # 10-step BullMQ worker analysis pipeline
│       └── producer.ts             # Job dispatch interface
├── config/
│   ├── constants.ts                # Application thresholds, enums, & rooms
│   └── env.ts                      # Fail-fast schema-validated environment variables
├── db/
│   ├── client.ts                   # Postgres connection pool
│   ├── migrations/                 # Schema definition SQL files (001 to 009)
│   └── queries/                    # Strongly-typed data access objects
├── imageProcessing/
│   └── resize.util.ts              # Sharp-based image optimization utility
├── integrations/
│   └── gemini/                     # Vision, Chat, and Translation integrations
├── jobs/
│   └── zoneRiskRecompute.job.ts    # cron job ensuring zone-risk synchronization
├── middleware/                     # Authentication, RBAC, Validate, Audit logging, Rate limiting
├── services/                       # Feature modules (controllers, routes, services, schemas)
│   ├── auth/                       # OTP & Password authentication flows
│   ├── chat/                       # Context-aware chat sessions
│   ├── dashboard/                  # Administrative aggregate stats & CSV export
│   ├── drone/                      # Missions tracking & telemetry image uploads
│   ├── notifications/              # Real-time WebSockets & stubs
│   ├── reports/                    # Exif GPS extraction & report submission
│   ├── workorders/                 # Priority scoring & PHI remediation lifecycle
│   └── zones/                      # Regional aggregation & recomputing risk
├── shared/                         # Common error handling, pagination, and logger
└── worker.ts                       # Worker process entry point
```

---

## 🗄️ Database Migrations

The database is built on relational schemas with spatial PostGIS geometry:

| Migration | Purpose | Key Details |
| :--- | :--- | :--- |
| **`001_enable_extensions`** | Core extensions setup | Installs `uuid-ossp` and `postgis` spatial extensions. |
| **`002_create_users`** | Identity schema | Supports `Reporter`, `Drone Operator`, `PHI`, and `NDCU Admin` roles. |
| **`003_create_zones`** | Territorial boundaries | Stores spatial polygons (`GEOMETRY(Polygon, 4326)`) and district/health indicators. |
| **`004_create_drone_missions`**| Flight coordination | Tracks drone operator coordinates, paths, status, and zone bindings. |
| **`005_create_reports`** | Incident reports | Stores GPS metadata (`GEOMETOMETRY(Point, 4326)`), confidence scores, and raw/translated guidance. |
| **`006_create_workorders`** | Action items | Implements resolution notes, priority scores, and a unique active status constraint. |
| **`007_create_drone_image_reports`**| Telemetry frames | Records location telemetry for each frame captured in a drone mission flight. |
| **`008_create_audit_log`** | Non-repudiation audit | Immutable table recording user actions, IP addresses, and state diffs. |
| **`009_create_chat`** | Dialogue memory | Session-oriented chat history with localized tags for Gemini support. |

---

## 🚀 Key Implemented Modules

### 1. Identity & Security (Step 2)
* **RBAC:** Four roles (`community_reporter`, `drone_operator`, `phi`, `ndcu_admin`) enforced via route-level middleware.
* **OTP Store:** Redis-backed stateless OTP storage with a configurable TTL, login attempt limitation, and rate limiting.
* **Audit Trail:** Immutable logging on all write requests (POST/PATCH/DELETE) tracking who modified what, including old/new JSON payloads.

### 2. Multi-Driver Storage & Metadata Processing (Step 3)
* **Storage Abstraction:** Swap between `localStorage` (dev) and `S3Storage` (production) transparently.
* **Metadata & EXIF:** Parses coordinates directly from JPEG headers for automatic PostGIS zone mapping. Strips tracking vectors from reporter uploads for security.

### 3. Event-Driven AI Queue Loop (Step 4)
* **BullMQ Pipeline:** Processes images using parallel workers rate-limited to 10 Gemini requests per minute with exponential backoff retries.
* **Analysis Cycle:** 
  1. Image optimized to `1920px` width.
  2. Gemini processes breeding potential and remediation steps.
  3. Guidance translated to Sinhala and Tamil in parallel.
  4. If confidence `< 0.70`, marked for human review.
  5. Critical risks trigger an automated Work Order creation and Zone Risk update.

### 4. Work Orders & Zone Scoring (Step 5)
* **Remediation Lifecycle:** NDCU Admins or automated triggers generate work orders. PHI officers accept and mark them resolved by submitting proof of action.
* **Priority Calculation:** Scaled score ($0\text{-}100$) base-weighted by site threat level, decayed by hours pending, and boosted by zone density.
* **Zone Risk Metric:** Calculated using a weighted formula based on density of high/critical threats:
  $$\text{Score} = \min\left(100, \text{round}\left(\frac{\text{critical} \times 30 + \text{high} \times 15 + \text{others} \times 5}{300} \times 100\right)\right)$$

### 5. WebSockets & Real-Time Broadcasts (Step 6)
* **Connection Gating:** Handshakes are verified using JWTs.
* **Event Scoping:** Joins connections to specific rooms (`ndcu_admins` or `phi_user_{id}`).
* **Broadcasts:** Emits instant alerts on report status modifications, priority tasks, and zone updates.

### 6. Unmanned Flight Interception (Step 7)
* **Missions:** Operators register trajectories, start missions, upload coordinate-mapped frames, and resolve them.
* **Frame Analysis:** Frames undergo GPS spatial matching and are automatically fed into the Gemini pipeline.

### 7. Conversational Assistant (Step 8)
* **Contextual Feed:** Generates a real-time, privacy-safe JSON snapshot containing national metrics and zone summaries.
* **Dialogue Memory:** Injects recent message turns into the Gemini system prompt. Automatically titles sessions based on first prompt.

### 8. Analytics & CSV Exports (Step 9)
* **Dashboard Summary:** Fetches 7-day reports trend, status breakdowns, and zone metrics in a single round-trip.
* **Privileged Exporters:** NDCU Admins can export up to 10k reports in CSV format with date, status, and zone filters.

---

## 🔌 API Route Reference

All endpoints are prefixed with `/api/v1` and authenticated using JWT:

```
# Authentication
POST   /auth/reporter/request-otp     # Request SMS verification code
POST   /auth/reporter/verify-otp      # Complete OTP verification, returns tokens
POST   /auth/staff/login              # Staff password verification
POST   /auth/staff/register           # Register new staff member (Admin only)
POST   /auth/refresh                  # Refresh access token
GET    /auth/me                       # Fetch current user profile

# Incident Reports
POST   /reports                       # Submit community report (multipart-form)
GET    /reports                       # List reports with status & zone filters
GET    /reports/:id                   # Retrieve report analysis detail
PATCH  /reports/:id/review            # Review and label a report (PHI/Admin only)

# Work Orders
POST   /workorders                    # Manually spawn work order (Admin only)
GET    /workorders                    # Query tasks (restricted views)
PATCH  /workorders/:id/accept         # Assign task to requesting PHI
PATCH  /workorders/:id/assign         # Delegate task (Admin only)
PATCH  /workorders/:id/resolve        # Resolve task with optional follow-up image
PATCH  /workorders/:id/cancel         # Terminate task (Admin only)

# Territorial Zones
GET    /zones                         # Query zones with risk level & district filters
GET    /zones/:id                     # Retrieve zone metadata
GET    /zones/:id/reports             # Retrieve reports associated with zone

# Drone Missions
POST   /drone/missions                # Create flight blueprint (Operator/Admin only)
GET    /drone/missions                # List flights
PATCH  /drone/missions/:id/status    # Start/stop flight mission
POST   /drone/missions/:id/frames     # Upload flight telemetry photo frame

# Conversational Assistant
POST   /chat/message                  # Submit message turn
GET    /chat/sessions                 # Fetch message history list
GET    /chat/sessions/:id             # Fetch conversation messages list

# Analytics
GET    /dashboard/summary             # Retrieve platform metric aggregation
GET    /dashboard/export              # Download CSV export of reports (Admin only)
```

---

## ⚙️ Environment Variables

Copy the following into your `.env` configuration file:

```env
# Runtime Config
NODE_ENV=development
PORT=3000
API_BASE_PATH=/api/v1
CORS_ALLOWED_ORIGINS=http://localhost:5173

# Database & Cache
DATABASE_URL=postgresql://user:password@localhost:5432/dengueguard?sslmode=disable
REDIS_URL=redis://localhost:6379/0

# Authentication
JWT_ACCESS_SECRET=your-32-character-minimum-access-secret-key
JWT_REFRESH_SECRET=your-32-character-minimum-refresh-secret-key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
OTP_LENGTH=6
OTP_EXPIRES_IN_SECONDS=300

# Gemini Generative AI
GEMINI_API_KEY=AIzaSy...your-gemini-key
GEMINI_CHAT_MODEL=gemini-2.0-flash-lite
GEMINI_VISION_MODEL=gemini-2.0-flash-lite
GEMINI_TRANSLATION_MODEL=gemini-2.0-flash-lite
AI_ANALYSIS_CONFIDENCE_THRESHOLD=0.70

# Storage Config
STORAGE_DRIVER=local
UPLOADS_DIR=./uploads
# S3_BUCKET=
# S3_REGION=ap-south-1
# S3_ACCESS_KEY_ID=
# S3_SECRET_ACCESS_KEY=

# Schedulers
ZONE_RISK_RECOMPUTE_CRON=*/15 * * * *
```
