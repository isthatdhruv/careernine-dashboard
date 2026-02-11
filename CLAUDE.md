# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Simplified Admin Dashboard & Report Generation System** - A streamlined application for managing user data and generating career assessment reports in English and Hindi. This is a stripped-down version focused solely on admin functionality and report generation.

## Technology Stack

- **Frontend/Backend**: Next.js 15 (App Router), React 18, TypeScript
- **Database & Auth**: Firebase (Firestore, Authentication)
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

## Application Structure

### Core Routes

- **`/`** - Root page with auth-based redirect:
  - Authenticated → `/admin/dashboard`
  - Not authenticated → `/login`
- **`/login`** - Admin authentication page
- **`/admin/dashboard`** - Main admin interface for managing users and reports
- **`/admin/reports`** - Report management page
- **`/admin/orphaned-users`** - User management for orphaned accounts

### API Routes

All admin functionality is under `/api/admin/`:

- **Report Generation**:
  - `run-normalizer` - Normalize Hindi report data
  - `run-normalizer-english` - Normalize English report data
  - `run-pipeline-phase` - Execute specific report generation phases
  - `list-reports` - List available generated reports
  - `view-report` - View report metadata

- **Report Download**:
  - `download-pdf` - Download single PDF report
  - `download-batch-zip` - Download multiple reports as ZIP

- **Data Management**:
  - `export-detailed` - Export detailed user data
  - `upload-to-drive` - Upload reports to Google Drive
  - `orphaned-users` - Manage users without proper tenant assignment

- **User Data**:
  - `/api/users/creation-times` - Get user creation timestamps

## Report Generation System

The report generation is a **Python-based pipeline** with multiple phases:

### Pipeline Phases (both English/Hindi)

Located in `report-gen-english/` and `report-gen-hindi/`:

1. **Data Normalizer** (`00_data_normalizer.py`) - Normalize Firestore data
2. **Eligibility Check** (`00_eligibility_check.py`) - Validate assessment completion
3. **Core Analysis** (`01_core_analysis.py`) - Analyze assessment responses
4. **Career Pathway Analysis** (`02_career_pathway_analysis.py`) - Match career paths
5. **Career Matching** (`03_career_matching.py`) - Generate recommendations
6. **AI Summaries** (`04_ai_summaries.py`) - Generate AI-powered insights
7. **Data Enrichment** (`05_data_enrichment.py`) - Enrich with additional data
8. **Generate Reports** (`06_generate_reports.py`) - Create final DOCX/PDF

### Running Report Generation

The admin dashboard triggers Python scripts via API endpoints. The Node.js backend uses `child_process` to execute Python scripts with proper virtual environment activation.

### Python Dependencies

Each report generator has its own `requirements.txt`:
- `report-gen-english/requirements.txt`
- `report-gen-hindi/requirements.txt`

Install Python dependencies:
```bash
cd report-gen-english
pip install -r requirements.txt

cd ../report-gen-hindi
pip install -r requirements.txt
```

## Firebase Architecture

### Collections

- **`users`** - User profiles and assessment responses (read by admin)
- **`settings`** - Global settings
- **`payments`** - Payment transaction records (legacy, not actively used)

### Admin Access

- Firebase Admin SDK initialized in `firebase-admin.ts` (root) and `app/firebase-admin.ts`
- Client-side Firebase configured in `app/firebase.ts`
- Authentication required to access `/admin/*` routes

## Admin Dashboard Features

The admin dashboard (`/admin/dashboard`) provides:

1. **User Management**:
   - View all registered users
   - See assessment completion status
   - View user details and assessment responses

2. **Report Generation**:
   - Run data normalizer for English/Hindi
   - Execute report generation pipelines
   - Monitor generation progress

3. **Report Management**:
   - List all generated reports
   - Download individual reports as PDF
   - Batch download reports as ZIP
   - Upload reports to Google Drive

4. **Data Export**:
   - Export detailed user data to CSV/Excel
   - View user creation times and statistics

5. **Orphaned User Management**:
   - View users without proper tenant assignment
   - Reassign or clean up orphaned accounts

## Environment Variables

Required in `.env.local`:

```bash
# Firebase (Required)
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

**Note**: Razorpay and Calendly variables removed as payment and scheduling features have been stripped out.

## Code Structure

### Component Organization

- `app/components/` - Shared UI components:
  - `Header.tsx` - Application header
  - `Footer.tsx` - Application footer
  - `Input.tsx` - Reusable input component
  - `LoadingSpinner.tsx` - Loading indicator
  - `LoginForm.tsx` - Admin login form
  - `LayoutShell.tsx` - Layout wrapper

- `app/admin/components/` - Admin-specific components

### Type Definitions

- `app/types.ts` - Shared TypeScript types

### Utilities

- `app/utils/` - Utility functions and defaults

## Authentication Flow

1. Admin visits root (`/`)
2. Auth state checked via Firebase
3. If authenticated → redirect to `/admin/dashboard`
4. If not authenticated → redirect to `/login`
5. After login → redirect to `/admin/dashboard`

## Removed Features

This version has been stripped down from the original multi-tenant assessment platform. The following features have been removed:

- ❌ Multi-tenant system (subdomain-based routing)
- ❌ User registration and user-facing pages
- ❌ Assessment questionnaires (Personality, Ability, Values, etc.)
- ❌ Payment system (Razorpay integration)
- ❌ Coupon management
- ❌ Calendly scheduling integration
- ❌ User dashboard and profile pages

## Important Notes

- **Single Admin Instance**: No multi-tenancy, single admin dashboard only
- **No User Registration**: Users are managed directly by admin or imported from data
- **Report-Focused**: Primary purpose is generating and managing reports
- **Standalone Output**: Next.js configured with `output: 'standalone'` for Docker deployment
- **Build Warnings Disabled**: ESLint and TypeScript errors don't block builds (see `next.config.ts`)
- **Python Dependencies**: Both English and Hindi report generators have separate `requirements.txt`
- **Admin Authentication**: Single admin login, no multi-user admin system

## Utility Scripts

Available in `scripts/`:

```bash
# Settings management
node scripts/initialize-settings.js  # Initialize Firestore settings
node scripts/check-settings.js       # Verify settings configuration

# User management
node scripts/check-user.js           # Check user details
node scripts/delete-users.js         # Delete users
node scripts/standardize-user-data.js # Standardize user data format
node scripts/check-unused-firestore.js # Find unused Firestore data
```

## Docker Deployment

The application is containerized with:
- **Dockerfile** - Production build with Node.js and Python
- **Dockerfile.dev** - Development build
- **docker-compose.yml** - Multi-container setup (app + nginx)
- **nginx/** - Nginx reverse proxy configuration

The Dockerfile installs both Node.js and Python dependencies and builds the Next.js application for production deployment.
