# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
npm run dev          # Start Next.js dev server (port 3000)
npm run build        # Production build (standalone output for Docker)
npm run lint         # ESLint
```

Note: `next.config.ts` ignores ESLint and TypeScript errors during builds (`ignoreDuringBuilds: true`, `ignoreBuildErrors: true`).

### Docker

```bash
docker-compose up          # Start app + nginx containers
docker-compose up --build  # Rebuild and start
```

Nginx reverse proxy runs on ports 80/443, proxies to app on 3000.

### Report Generation Pipeline (Python)

```bash
cd report-gen-english   # or report-gen-hindi
python master_pipeline.py          # Run all 6 phases
python pipeline_menu.py            # Interactive phase selection
python 00_data_normalizer.py       # Run individual phase
```

Requires Python venv with `requirements.txt` (pandas, numpy, matplotlib, openai, jinja2).

## Architecture

### Next.js App (App Router, Next.js 15, React 18, TypeScript, Tailwind CSS)

**Root page** (`app/page.tsx`) redirects to `/admin/dashboard`.

**Admin pages** under `app/admin/`:
- `dashboard/page.tsx` — Main admin dashboard (~3000 lines, client component). Password-protected, handles student management, analytics charts (Chart.js), Excel export (xlsx), assessment data processing.
- `reports/page.tsx` — Report generation UI. Upload Excel files, run pipeline phases, download PDFs, batch ZIP, Google Drive upload.
- `orphaned-users/page.tsx` — Cleanup users missing Firestore records.

**Admin layout** (`app/admin/layout.tsx`) wraps all admin pages with `AdminNav` component.

### API Routes (all under `app/api/admin/`)

- `run-pipeline-phase/` — Executes Python pipeline phases 0-6 via `child_process.exec`
- `run-normalizer/` and `run-normalizer-english/` — Data normalization (Hindi/English)
- `download-pdf/` — Single PDF via Puppeteer
- `download-batch-zip/` — Multiple reports as ZIP (JSZip + Puppeteer)
- `list-reports/` — Lists reports from `reports_metadata.json`
- `view-report/` — Preview report HTML
- `upload-to-drive/` — Google Drive upload via googleapis
- `export-detailed/` — Export student data
- `orphaned-users/` — Manage orphaned Firebase Auth users

### Report Generation Pipeline (Python, 6 phases)

Located in `report-gen-english/` and `report-gen-hindi/` (parallel structures):

0. **Data Normalization** — Standardizes OMR/online data → `input.xlsx`
1. **Core Analysis** — Processes assessment responses, calculates scores
2. **Career Pathway Analysis** — Maps results to career pathways
3. **Career Matching** — Matches students to suitable careers
4. **AI Summaries** — OpenAI API for personalized summaries (supports `--resume`)
5. **Data Enrichment** — Additional insights and validation
6. **Report Generation** — HTML reports via Jinja2 templates → `report pdf pages/`

Class-specific report scripts in `final_report_scripts/`: grades 6-8, 9-10, 11-12.

### Firebase

**Client SDK** (`app/firebase.ts`): Exports `auth` and `db` (Firestore). Uses `NEXT_PUBLIC_FIREBASE_*` env vars.

**Admin SDK**: Multiple duplicate modules exist at `firebase-admin.ts` (root), `app/lib/firebase-admin.ts`, `app/lib/firebase-admin-server.ts`, `app/lib/firebaseAdmin.ts`. These are historical duplicates — prefer `app/lib/firebase-admin.ts`.

**Firestore collections**: `users`, `settings`, `coupons`, `payments`. Tenant configs at `settings/{tenantId}`.

### Multi-Tenancy

Subdomain-based tenant routing via `middleware.ts` (injects `x-tenant` header). Tenant configs in Firestore. Host-based rewrites in `next.config.ts` for `nbis`, `aspire`, `dalimss` subdomains.

Management scripts in `scripts/`: `create-tenant.js`, `delete-tenant.js`, `list-tenants.js`, `set-tenant-password.js`.

### PDF Generation

`utils/pdfGenerator.ts` uses Puppeteer (headless Chrome) to render HTML reports to A4 PDFs.

### Assessment Score Calculations (in dashboard)

- **Aptitude**: 10 categories × 3 questions, weights A=4, B=3, C=3, D=1
- **Multiple Intelligence**: 24 questions across 8 categories, weights A=4, B=3, C=2, D=1
- **RIASEC**: 54 questions (6 codes × 9), YES=2, NO=1
- **SOI/Values**: Top 5 from 15 categories each

### Key Path Aliases

`@/*` maps to project root (configured in `tsconfig.json`).

## Environment Variables

Firebase config (`FIREBASE_*`, `NEXT_PUBLIC_FIREBASE_*`), Razorpay (`RAZORPAY_*`), Calendly (`CALENDLY_*`). See `.env.local`.

## Deployment

Docker-based with standalone Next.js output. Dockerfile installs both Node.js and Python dependencies plus Puppeteer/Chrome. Nginx handles reverse proxy, rate limiting, static caching, and security headers.
