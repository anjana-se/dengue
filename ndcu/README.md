# DengueGuard Operations Portal

Urban dengue surveillance & response portal for the **NDCU (National Dengue Control Unit), Sri Lanka**.
Built for the AtLink Hackathon 2026.

Implemented from the Claude Design project
`28a52014-5b7e-4071-add2-5703a3c8d4de` → `DengueGuard Portal.dc.html`.

## Run it

It's a self-contained single-page app — no build step.

```powershell
# Option A: just open the file
start index.html

# Option B: serve it (recommended; avoids file:// quirks)
npx serve .
# or
python -m http.server 8080
```

Then pick a role on the login screen (**NDCU Admin**, **PHI Field Officer**, or **Drone Operator**) — any credentials work; auth is mocked.

> Requires an internet connection: React 18, Leaflet + plugins, Inter font, and map tiles load from CDNs (unpkg / CARTO / Google Fonts).

## Features

- **Operations dashboard** — live risk-zone map (Leaflet), KPI cards, AI recommendations, 14-day outbreak forecast banner.
- **Map layers** — breeding-site reports (community + drone), zone risk heatmap, confirmed dengue cases (cluster / heatmap views), outbreak forecast bands.
- **Reports** — incoming AI-triaged breeding-site reports with confidence + guidance.
- **Work orders** — create, dispatch to PHI officers, and resolve.
- **Drone missions** — mission upload/processing summaries.
- **Assistant** — chat panel (EN / Sinhala / Tamil copy).
- **Demo / Live modes** — simulate streaming reports, zone updates, and new cases.

## Structure

| Path | Purpose |
|------|---------|
| `index.html` | The implemented app. Real React 18 (UMD) + Leaflet from CDN; the design's component logic runs verbatim via a small `DCLogic → React.Component` shim. No Babel, no JSX, no proprietary runtime. |
| `design/DengueGuard Portal.dc.html` | Original Claude Design source (kept for re-sync / reference). |
| `design/support.js` | Claude Design runtime for the `.dc.html` source. |

To pull design updates later, re-fetch the `.dc.html` from the design project and regenerate `index.html`.

## Data & compliance

⚠️ This build uses **synthetic mock data only** — no real patient records.

The domain model includes health information (confirmed dengue cases with location, age
group, and hospital). Before any real deployment that ingests patient/case data, the
data-handling design (residency, encryption, access control, audit logging, consent,
retention) must be reviewed and validated by qualified legal/compliance counsel against
the applicable Sri Lankan data-protection regulations (and any partner requirements).
The guidance here is not a substitute for that review.

## Tech notes

- Component code is plain `React.createElement` (no JSX) + ES2022 class fields, so it runs
  directly in modern browsers with no transpilation.
- State is a single React component; report/order/case data is generated client-side and
  persisted to `localStorage` for layer/view preferences only.
