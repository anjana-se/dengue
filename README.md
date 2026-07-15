# 🦟 DengueGuard: AI-Powered Dengue Surveillance & Mitigation Platform

**DengueGuard** is an advanced, automated Dengue surveillance and vector control routing platform. By integrating AI-driven breeding site analysis, drone telemetry processing, spatial risk mapping (PostGIS), and automated work order dispatching, DengueGuard empowers environmental officers, drone operators, and citizens to collaborate dynamically in mitigating mosquito vector propagation.

---

## 🏗️ Repository Architecture

This repository is structured as a monorepo setup containing the core DengueGuard components:

* [**`backend/`**](file:///f:/AtLink/Github/dengue/backend) — The complete Node.js / Express.js / TypeScript API server and BullMQ background worker engine.
* **Database & Cache** — PostgreSQL (equipped with PostGIS spatial extensions) and Redis, orchestrating task queues and OTP sessions.

---

## 🌟 Core System Features

### 1. 🔑 Authenticated Access Control & Email OTP

* **Transactional Verification**: Users log in securely via password or request an email-based One-Time Password (OTP) via the `/auth/otp/request` endpoint.
* **Secure Delivery & Caching**: OTPs are generated dynamically, hashed using SHA-256, cached in Redis with a strict Time-To-Live (TTL), and dispatched using a transactional email provider integration (Resend).
* **Role-Based Access Control (RBAC)**: Enforces precise system roles including **NDCU Admin**, **Public Health Inspector (PHI)**, **Drone Operator**, and **Community Reporter**.

### 2. 📋 Intelligent Incident Reporting

* **Photo Processing**: Citizens submit photo reports. The backend parses EXIF headers to retrieve camera GPS coordinates automatically if none are provided.
* **Privacy Guard**: Community photos have their EXIF metadata dynamically stripped upon processing for reporter privacy, while drone imagery retains exact telemetry tags.
* **Resilient Image Pipeline**: A fallback mechanism ensures that if Sharp encounters corrupted JPEG headers during testing or manual uploads, it gracefully duplicates the file and proceeds without raising server-level exceptions.

### 3. 🧠 AI Breeding Site Analysis (Gemini Vision)

* **Automated Evaluation**: A background BullMQ worker pulls reports and passes processed images to the Gemini API (`gemini-2.0-flash-lite`) to classify breeding sites, assess confidence levels, and generate customized remediation instructions.
* **Multi-lingual Translation**: Guidance strings are instantly translated into Sinhala and Tamil in parallel via Gemini to provide accessible local warnings.
* **Risk Gates**: Breeding indicators below safe confidence thresholds are automatically flagged for manual review by a human PHI officer (`needs_human_review`).

### 4. 🗺️ Spatial Territorial Risk Engine

* **Geospatial Boundaries**: Tracks territorial zones with administrative GeoJSON boundaries.
* **Auto-assignment**: PostGIS spatial queries (`ST_Contains`, `ST_MakePoint`) evaluate coordinates to auto-assign incoming reports to their corresponding physical zones.
* **Dynamic Scoring**: The system dynamically recomputes zone-wide risk index scores whenever reports are added or resolved, reflecting live field parameters.

### 5. 🛠️ Work Order & Field Dispatch Management

* **Auto-routing**: Reports classified by AI as high or critical risk automatically spawn actionable Field Work Orders.
* **End-to-End Lifecycle**: Manages work order states sequentially: `open` ➔ `accepted` ➔ `resolved` / `cancelled`.
* **Resolution Feedback Loop**: PHI officers accept work orders, complete physical spraying/remediation, upload follow-up confirmation photos, and log outcome labels to update the main report registry.

### 6. 🚁 Drone Mission & Telemetry Frames

* **Flight Logging**: Operators register flight missions and track status transitions (e.g. `scheduled` ➔ `flying` ➔ `completed`).
* **Telemetry Uploads**: Accepts automated drone frame coordinates, saving spatial coordinates to cross-reference hot-spots.

---

## 🛠️ Tech Stack

* **Runtime**: Node.js & TypeScript
* **API Framework**: Express.js
* **Database**: PostgreSQL with PostGIS extension
* **Cache & Queue**: Redis & BullMQ
* **Image Processing**: Sharp
* **Email Deliverability**: Resend Client SDK
* **Large Language Model**: Google Generative AI (Gemini SDK)

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed on your machine:

* [Node.js (v18+)](https://nodejs.org/)
* [Docker Desktop](https://www.docker.com/products/docker-desktop/)
* npm (v9+)

---

### Step 1: Clone and Install Dependencies

Navigate to the backend directory and install all required modules:

```powershell
cd backend
npm install
```

### Step 2: Configure Environment Variables

Create a `.env` file in the `./backend` directory based on the provided `.env.example`:

```env
PORT=3000
NODE_ENV=development

# Database configuration
DATABASE_URL=postgresql://dengueguard:dengueguard123@localhost:5432/dengueguard_db

# Cache & Worker Queues
REDIS_URL=redis://localhost:6379

# Cryptography Secrets
JWT_SECRET=super-secret-jwt-key-dengueguard-backend-321
JWT_REFRESH_SECRET=super-secret-jwt-refresh-key-dengueguard-backend-321

# Transactional Mail
RESEND_API_KEY=re_ZZEaHvWj_DfaAEa7B2zX8pYS6esqpmqwn

# Google Gemini LLM API
GEMINI_API_KEY=your_gemini_api_key_here
```

### Step 3: Run Database & Cache Container Stack

Spin up PostgreSQL (PostGIS) and Redis services inside Docker:

```powershell
docker compose up -d
```

### Step 4: Apply Database Schema & Seed Data

Run the migrations to create the tables, spatial indices, and trigger functions:

```powershell
npm run migrate
```

After successfully migrating, seed the database with initial territorial zones and default staff accounts (Admin, PHI, Drone Operators):

```powershell
npm run seed
```

### Step 5: Start the Platform

You must start both the API Server and the background Queue Worker.

* **To run the API Server**:

    ```powershell
    npm run dev:api
    ```

* **To run the BullMQ background worker**:

    ```powershell
    npm run dev:worker
    ```

---

## 🧪 Testing & Validation

DengueGuard comes with a fully automated, end-to-end integration and API validation script that tests authentication, image resizing, PostGIS lookups, reports, work orders, drone telemetry uploads, and dashboard analytics.

Run the test suite from the `backend/` directory:

```powershell
npx ts-node scripts/validate.ts
```

Refer to the validation status checkmarks inside [**`backend/api.md`**](/backend/api.md) for live server compliance details.
