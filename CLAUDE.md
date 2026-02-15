# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Career Navigator 360 — a multi-tenant career assessment platform built with Next.js 16 (App Router), Firebase (Auth + Firestore), Razorpay payments, and Calendly scheduling.

## Commands

- `npm run dev` — Start dev server (Turbopack enabled)
- `npm run build` — Production build (standalone output)
- `npm run start` — Start production server
- `npm run lint` — ESLint (next/core-web-vitals)

## Architecture

### Multi-Tenancy

Subdomain-based tenant routing via `middleware.ts`. The middleware extracts the tenant from the hostname and injects an `x-tenant` header. Tenant config (fetched from `/api/tenant-config`) controls feature flags like `enablePayments` and `enableCalendly`. Configured tenants: `aspire`, `nbis`, `dalimss`.

### Path Alias

`@/*` maps to `./app/*` (not `./src/*`). All imports use `@/` prefix.

### Firebase Setup

- **Client SDK** (`app/firebase.ts`): Used in `'use client'` components for auth and Firestore real-time listeners (`onSnapshot`).
- **Admin SDK** (`app/lib/firebase-admin.ts`): Used in API routes only. Externalized from client bundles via `next.config.ts` webpack/serverExternalPackages config.

### Firestore Collections

- `users/{userId}` — Profile, educational info, payment status, assessment card statuses, counseling appointments
- `settings/pricing` and `settings/plans` — Plan pricing (amounts in paise, e.g., 99900 = ₹999)
- `coupons/{couponId}` — Discount codes with optional fixed pricing and plan restrictions
- `payments/{paymentId}` — Transaction records linking to Razorpay

### Auth Flow

Registration has two paths based on tenant config:
1. **Payments disabled** (e.g., aspire): Direct Firebase auth creation + Firestore write → dashboard redirect
2. **Payments enabled**: Razorpay order → payment → auth creation + Firestore write

Orphaned account detection handles cases where Firebase auth succeeds but Firestore write fails (15-second timeout, auto sign-out).

### Key Directories

- `app/api/` — API routes (Razorpay orders, payment verification, coupons, Calendly, tenant config, admin exports)
- `app/components/` — Shared UI components (forms, modals, layout shell, input fields)
- `app/data/` — Static assessment question data (JSON-like TS files for 6 assessment types)
- `app/utils/` — Utility functions, default values, sanitization
- `app/server/` — Server-side utilities

### Assessment Pages

Six assessment sections, each with its own page and form component:
`/subjects-of-interest`, `/values`, `/ability`, `/personality`, `/multiple-intelligence`, `/career-aspirations`

Assessment completion tracked in `cardsStatus` field on user document.

### Payment Flow

Razorpay integration with coupon support. Plans: "assessment" and "counselling" (with upgrade path). Payment verification endpoint exists but uses simplified verification. Webhook handler at `/api/razorpay-webhook`.

## Code Conventions

- Client components require `'use client'` directive
- TypeScript strict mode is disabled; `any` is allowed (ESLint rule disabled)
- Input sanitization applied to all user-facing form fields (control chars removed, email lowercased, phone: 10 digits)
- Firestore writes use retry logic with exponential backoff (3 attempts, max 5s)
- Currency amounts stored in paise (Indian paisa), not rupees

## Environment Variables

Required in `.env.local`: Firebase config (`FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`), Razorpay config (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY`), optional Calendly config (`CALENDLY_API_KEY`, `CALENDLY_ORGANIZATION`).
