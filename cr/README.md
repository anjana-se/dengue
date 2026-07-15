# DengueGuard — Community Reporter

A mobile-first, trilingual (English / සිංහල / தமிழ்) web app for reporting mosquito
breeding sites. Residents snap a photo of standing water, the app captures their GPS
location, and the report is analysed and routed to a response team.

Implemented from the `DengueGuard.dc.html` design with **React + Vite + TypeScript**
and **real device APIs** (camera, geolocation, Leaflet map).

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

```bash
npm run build      # type-check (tsc -b) + production bundle to dist/
npm run preview    # serve the production build locally
npm run typecheck  # types only, no emit
```

## Testing camera & GPS on a real phone

The camera (`getUserMedia`) and location (`navigator.geolocation`) APIs only work in a
**secure context** — `localhost` or **HTTPS**. The dev server is exposed on the LAN
(`server.host` is on), but a plain `http://192.168.x.x:5173` origin on a phone will
**block** camera/GPS. To exercise the real device flow on a handset, serve over HTTPS:

- add [`@vitejs/plugin-basic-ssl`](https://github.com/vitejs/vite-plugin-basic-ssl) for a
  self-signed dev cert, **or**
- expose `localhost` through a tunnel (`cloudflared tunnel`, `ngrok http 5173`, …).

On desktop, `localhost` is already a secure context, so both APIs work there.

## Project structure

```
src/
  App.tsx                    Route/state machine + phone frame + chrome visibility
  main.tsx                   Entry; wraps <App> in <LanguageProvider>
  theme.ts                   Design tokens: colours, RISK + STATUS palettes
  types.ts                   Shared domain types (Report, GeoPoint, AnalysisResult…)
  i18n/
    strings.ts               en / si / ta string tables (source of truth = en)
    LanguageProvider.tsx     Context + useI18n() (t, L, lang, setLang; persisted)
  lib/
    camera.ts                getUserMedia + frame capture + gallery file read
    geolocation.ts           navigator.geolocation + OSM reverse-geocoding (timeout)
    analyze.ts               Photo→risk analysis  (SIMULATED — see "Seams")
    risk.ts                  Action guidance per risk level
    mock.ts                  Seed "My reports" data + relative-time formatting
  components/
    Header, BottomNav, LangPills, Toast, Badges, DetailSheet, LeafletMap, icons, ui
  screens/
    WelcomeScreen, LoginScreen, ReportsScreen, HelpScreen
    capture/                 PermissionStep, CameraStep, ConfirmStep,
                             ProcessingStep, ResultStep, CaptureScreen (orchestrator)
```

## What is real vs simulated

**Real (browser device APIs):**

- **Camera** — rear-facing `getUserMedia` stream, center-cropped frame capture, gallery
  fallback.
- **Location** — `navigator.geolocation` with high accuracy; reverse-geocoded to a zone
  label via OpenStreetMap Nominatim (graceful coordinate fallback + 6s timeout).
- **Map** — Leaflet with OpenStreetMap tiles, non-interactive, pinned to the report.

**Simulated (no backend exists in the design) — clearly marked API seams:**

| Seam | File | Production step |
| --- | --- | --- |
| Auth / OTP | `screens/LoginScreen.tsx` | Issue + verify OTP **server-side**; real OIDC for Google. `000000` is a demo-only failure code. |
| Photo analysis | `lib/analyze.ts` | POST image + coordinates to the vision/analysis service; return the risk classification. |
| Report storage | `lib/mock.ts` | Replace `MOCK_REPORTS` with the reports API for the signed-in user. |

## Security & compliance notes

> Guidance below must be validated by qualified legal / compliance counsel before
> production use.

- **PII & location are personal data.** The client holds the photo and coordinates only
  in memory until submit; nothing is uploaded automatically. Transmit over TLS and apply
  retention/minimisation server-side. Strip EXIF from photos on ingest.
- **Never trust client-side verification.** The OTP check here is demonstrative only —
  verification, rate-limiting, and session issuance must be server-side.
- **Data residency.** Reverse-geocoding currently calls the public OSM Nominatim service
  (a third party). For production, self-host Nominatim or use a contracted provider so
  location data stays within your compliance boundary (e.g. Sri Lanka PDPA, GDPR).
- **Secure by design.** Input is validated/bounded at the UI (mobile digits, OTP length,
  200-char description); mirror these checks and add authorization + audit trails on the
  server.

## Accessibility & UX

- Honours `prefers-reduced-motion` (all animations disabled).
- Language preference persists to `localStorage` and seeds from the browser locale.
- `viewport-fit=cover` + `env(safe-area-inset-*)` for notched devices.
