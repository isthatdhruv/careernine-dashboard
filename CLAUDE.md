# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Career Navigator 360 is a comprehensive career assessment and guidance platform built with Next.js 15, Firebase, and Python. It features multi-tenant architecture with subdomain-based routing, allowing multiple schools/organizations to have their own branded instances.

## Technology Stack

- **Frontend/Backend**: Next.js 15 (App Router), React 18, TypeScript
- **Database & Auth**: Firebase (Firestore, Authentication)
- **Payments**: Razorpay integration
- **Scheduling**: Calendly API integration
- **Report Generation**: Python (separate pipelines for English and Hindi reports)
- **Styling**: Tailwind CSS
- **Deployment**: Docker + Nginx reverse proxy

## Development Commands

### Running the Application

```bash
# Install dependencies
npm install

# Development server (localhost:3000)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

### Docker Development

```bash
# Start containers (app + nginx)
docker-compose up

# Rebuild containers
docker-compose up --build

# Stop containers
docker-compose down
```

### Python Report Generation

The report generation system has separate pipelines for English and Hindi reports, located in `report-gen-english/` and `report-gen-hindi/`. Each has its own Python virtual environment and dependencies.

## Multi-Tenant Architecture

### Core Concept

The application uses **subdomain-based multi-tenancy**. Each tenant (school/organization) gets its own subdomain and can have customized features.

### Key Files

- `middleware.ts` - Extracts tenant from hostname and adds to request headers
- `app/lib/tenant-config.ts` - Client-side tenant config fetching
- `app/lib/tenant-shared.ts` - Shared tenant types and utilities
- `app/api/tenant-config/route.ts` - Server-side tenant config API

### How It Works

1. User visits subdomain (e.g., `nbis.example.com`)
2. Middleware extracts subdomain (`nbis`) from hostname
3. Tenant identifier added to `x-tenant` header
4. Components/APIs fetch tenant-specific configuration from Firestore
5. Features (payments, Calendly) enabled/disabled per tenant

### Tenant Structure in Firestore

```typescript
{
  id: "subdomain",
  name: "Display Name",
  subdomain: "subdomain",
  features: {
    enablePayments: boolean,
    enableCalendly: boolean
  },
  settings: {
    supportEmail: string,
    calendlyUrl?: string,
    adminPassword?: string
  }
}
```

### Tenant Management Scripts

```bash
# Create new tenant
node scripts/create-tenant.js <subdomain> [name] [enablePayments] [enableCalendly] [calendlyUrl] [supportEmail] [adminPassword]

# List all tenants
node scripts/list-tenants.js

# Set admin password
node scripts/set-tenant-password.js <subdomain> <password>

# Delete tenant
node scripts/delete-tenant.js [subdomain] [--reassign <target>]

# Update tenant configuration
node scripts/update-tenant.js
```

## Firebase Architecture

### Collections

- `users` - User profiles and assessment responses
- `settings` - Global settings (pricing, plans)
- `tenants` - Tenant configurations (multi-tenancy)
- `coupons` - Discount coupon codes
- `payments` - Payment transaction records
- `appointments` - Calendly appointment tracking

### Admin Access

The Firebase Admin SDK is initialized in `firebase-admin.ts` for server-side operations. Client-side Firebase is configured in `app/firebase.ts`.

## Application Flow

### User Journey

1. **Registration** (`/register`) - User creates account with email/password
2. **Payment** (`/upgrade`) - Razorpay checkout (if tenant has payments enabled)
3. **Assessment Sections** (sequential):
   - Personality (`/personality`)
   - Ability (`/ability`)
   - Values (`/values`)
   - Subjects of Interest (`/subjects-of-interest`)
   - Career Aspirations (`/career-aspirations`)
   - Multiple Intelligence (`/multiple-intelligence`)
4. **Dashboard** (`/dashboard`) - View completion status, schedule counseling
5. **Scheduling** (`/schedule`) - Book Calendly appointment (if enabled)
6. **Profile** (`/profile`) - View/edit user information

### Admin Dashboard

Located at `/admin/dashboard` - password-protected (per-tenant passwords stored in Firestore).

Key admin features:
- View all users and their assessment progress
- Generate and download reports (English/Hindi)
- Create and manage coupon codes
- Export user data
- Upload reports to Google Drive
- View orphaned users (users without tenant assignment)

## API Routes

### Public APIs
- `/api/tenant-config` - Fetch tenant configuration
- `/api/check-coupon` - Validate coupon codes
- `/api/create-order` - Create Razorpay order
- `/api/verify-payment` - Verify Razorpay payment
- `/api/calendly/*` - Calendly integration endpoints

### Admin APIs (under `/api/admin/`)
- `download-pdf` - Download generated PDF reports
- `download-batch-zip` - Batch download reports as ZIP
- `export-detailed` - Export detailed user data
- `list-reports` - List available reports
- `orphaned-users` - Manage users without tenant
- `run-normalizer` - Trigger data normalization
- `run-pipeline-phase` - Run report generation phases
- `upload-to-drive` - Upload reports to Google Drive
- `view-report` - View report metadata

## Report Generation System

The report generation is a **Python-based pipeline** with multiple phases:

### Pipeline Phases (both English/Hindi)

1. **Data Normalizer** (`00_data_normalizer.py`) - Normalize Firestore data
2. **Eligibility Check** (`00_eligibility_check.py`) - Validate assessment completion
3. **Core Analysis** (`01_core_analysis.py`) - Analyze assessment responses
4. **Career Pathway Analysis** (`02_career_pathway_analysis.py`) - Match career paths
5. **Career Matching** (`03_career_matching.py`) - Generate recommendations
6. **AI Summaries** (`04_ai_summaries.py`) - Generate AI-powered insights
7. **Data Enrichment** (`05_data_enrichment.py`) - Enrich with additional data
8. **Generate Reports** (`06_generate_reports.py`) - Create final DOCX/PDF

### Running Report Generation via API

The admin dashboard triggers Python scripts via API endpoints. The Node.js backend uses `child_process` to execute Python scripts with proper virtual environment activation.

## Assessment Question Data

Pre-defined assessment questions are stored in `app/data/`:
- `personalityQuestions.ts` - MBTI-style personality assessment
- `abilityQuestions.ts` - Academic ability questions
- `multipleIntelligenceQuestions.ts` - Gardner's Multiple Intelligence framework

User responses are saved to Firestore under the user document.

## Environment Variables

Required in `.env.local`:

```bash
# Firebase
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY=

# Calendly
CALENDLY_API_KEY=
CALENDLY_ORGANIZATION=
```

## Code Structure Patterns

### Page Components
- Use Next.js App Router (server components by default)
- Client components marked with `'use client'`
- Layouts defined in `layout.tsx` files

### Form Components
- Located in `app/components/`
- Follow pattern: `[Section]Form.tsx` (e.g., `PersonalityForm.tsx`)
- State management with React hooks
- Firebase updates on form submission

### Type Definitions
- Shared types in `app/types.ts`
- Tenant types in `app/lib/tenant-shared.ts`

## Testing Utilities

Several test pages exist for debugging:
- `/test-registration` - Test registration flow
- `/test-errors` - Error handling test page
- `app/admin/test-dashboard-loop` - Test dashboard rendering

## Important Notes

- **Standalone Output**: Next.js configured with `output: 'standalone'` for Docker deployment
- **Build Warnings Disabled**: ESLint and TypeScript errors don't block builds (see `next.config.ts`)
- **Middleware Exclusions**: Middleware doesn't run on `/api/*`, `/_next/*`, or static assets
- **Multi-tenant DNS**: Production uses subdomain routing (configured in `next.config.ts` rewrites and nginx)
- **Python Dependencies**: Both English and Hindi report generators have separate `requirements.txt`
- **Admin Authentication**: Admin passwords stored per-tenant in Firestore, with hardcoded fallbacks for legacy tenants
