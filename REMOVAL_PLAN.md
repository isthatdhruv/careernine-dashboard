# Detailed Removal Plan - Strip to Admin Dashboard + Report Generation Only

**Branch**: `report-dashboard`
**Goal**: Remove all assessment, payment, scheduling, and multi-tenant features. Keep only admin dashboard and report generation.

---

## Phase 1: Remove Assessment Pages & Routes

### Delete Entire Directories
```
app/ability/
app/personality/
app/values/
app/subjects-of-interest/
app/career-aspirations/
app/multiple-intelligence/
```

### Delete User-Facing Pages
```
app/dashboard/          (user dashboard - NOT admin)
app/profile/
app/schedule/
app/upgrade/
app/forgot-password/
app/test-registration/
app/test-errors/
app/test-dashboard-loop/
```

**Keep**:
- `app/login/` - Needed for admin authentication
- `app/register/` - Optional (decide if you need user registration or admin-only)

---

## Phase 2: Remove Assessment Components

### Delete Assessment Form Components
```
app/components/AbilityForm.tsx
app/components/PersonalityForm.tsx
app/components/ValuesForm.tsx
app/components/SubjectsOfInterestForm.tsx
app/components/CareerAspirationsForm.tsx
app/components/MultipleIntelligenceForm.tsx
```

### Delete UI Components (Assessment-Specific)
```
app/components/AlreadySubmitted.tsx    (assessment completion check)
app/components/CompletionModal.tsx     (assessment completion modal)
app/components/FormWrapper.tsx         (assessment form wrapper)
app/components/CalendlyWidget.tsx      (scheduling widget)
app/components/ForgotPasswordForm.tsx  (if removing forgot password)
app/components/RegisterForm.tsx        (if removing registration)
```

**Keep**:
```
app/components/Header.tsx              (may need for admin UI)
app/components/Footer.tsx              (may need for admin UI)
app/components/Input.tsx               (general input component)
app/components/LoadingSpinner.tsx      (useful for admin dashboard)
app/components/LoginForm.tsx           (needed for admin login)
app/components/LayoutShell.tsx         (may need for layouts)
```

---

## Phase 3: Remove Assessment Data Files

### Delete Question Data
```
app/data/personalityQuestions.ts
app/data/abilityQuestions.ts
app/data/multipleIntelligenceQuestions.ts
```

**Keep**:
- `app/data/` directory if it has other data files needed for reports

---

## Phase 4: Remove Payment & Coupon Features

### Delete Admin Coupon Pages
```
app/admin/coupons/              (entire directory)
```

### Delete Payment/Coupon API Routes
```
app/api/check-coupon/
app/api/create-coupon/
app/api/create-order/
app/api/razorpay-webhook/
app/api/verify-payment/
app/api/init-pricing/
```

---

## Phase 5: Remove Calendly Integration

### Delete Calendly API Routes
```
app/api/calendly/              (entire directory including meetings/, test/)
```

---

## Phase 6: Simplify Multi-Tenant System (Optional)

**Option A: Keep Multi-Tenant** (if you need multiple organizations)
- Keep `app/api/tenant-config/`
- Keep `app/lib/tenant-config.ts`
- Keep `app/lib/tenant-shared.ts`
- Keep `middleware.ts`
- Keep tenant management scripts

**Option B: Remove Multi-Tenant** (single admin instance)

### Delete Multi-Tenant Infrastructure
```
app/api/tenant-config/
app/lib/tenant-config.ts
app/lib/tenant-shared.ts
middleware.ts                  (tenant extraction middleware)
```

### Delete Tenant Management Scripts
```
scripts/create-tenant.js
scripts/delete-tenant.js
scripts/list-tenants.js
scripts/set-tenant-password.js
scripts/update-tenant.js
scripts/update-tenant.ts
scripts/backfill-tenants.js
scripts/fix-tenant-assignment.js
scripts/test-tenant.js
```

### Modify Next.js Config
In `next.config.ts`, remove the `rewrites()` function (subdomain routing)

---

## Phase 7: Keep - Admin Dashboard & Reports

### Keep These Directories
```
app/admin/dashboard/           ✅ Main admin dashboard
app/admin/reports/             ✅ Report management
app/admin/orphaned-users/      ✅ User management
app/admin/layout.tsx           ✅ Admin layout
```

### Keep All Admin API Routes
```
app/api/admin/download-batch-zip/    ✅ Batch report download
app/api/admin/download-pdf/          ✅ Single report download
app/api/admin/export-detailed/       ✅ Data export
app/api/admin/list-reports/          ✅ List available reports
app/api/admin/orphaned-users/        ✅ User management
app/api/admin/run-normalizer/        ✅ Data normalization
app/api/admin/run-normalizer-english/ ✅ English data normalization
app/api/admin/run-pipeline-phase/    ✅ Report pipeline execution
app/api/admin/upload-to-drive/       ✅ Google Drive upload
app/api/admin/view-report/           ✅ View report metadata
app/api/users/creation-times/        ✅ User data (needed for admin)
```

---

## Phase 8: Keep - Report Generation System

### Keep Python Report Pipelines
```
report-gen-english/            ✅ English report generation
report-gen-hindi/              ✅ Hindi report generation
```

All Python scripts and data files in these directories are essential.

---

## Phase 9: Keep - Core Infrastructure

### Keep Core Files
```
app/firebase.ts                ✅ Firebase client config
app/firebase-admin.ts          ✅ Firebase admin SDK
firebase-admin.ts              ✅ Root Firebase admin config
app/types.ts                   ✅ Type definitions
app/globals.css                ✅ Global styles
app/layout.tsx                 ✅ Root layout
```

### Keep Configuration Files
```
package.json
tsconfig.json
tailwind.config.ts
postcss.config.mjs
next.config.ts                 (modify to remove rewrites if removing multi-tenant)
.eslintrc.json
```

### Keep Firebase Config
```
firebase.json
firestore.rules
firestore.indexes.json
.firebaserc
```

### Keep Docker & Deployment
```
Dockerfile
Dockerfile.dev
docker-compose.yml
nginx/                         (entire directory)
```

### Keep Utility Scripts (Selective)
```
scripts/initialize-settings.js     ✅ Firestore settings setup
scripts/check-settings.js          ✅ Verify settings
scripts/check-user.js              ✅ User verification
scripts/delete-users.js            ✅ User management
scripts/standardize-user-data.js   ✅ Data cleanup
scripts/initialize-appointments.js ❌ Delete (Calendly-related)
scripts/check-unused-firestore.js  ✅ Keep (cleanup utility)
```

---

## Phase 10: Modify Root Page

### Update `app/page.tsx`
Currently redirects to user flow. Options:
1. Redirect directly to `/admin/dashboard`
2. Redirect to `/login`
3. Create a simple landing page with admin login link

---

## Phase 11: Update Environment Variables

### Remove from `.env.local`
```
# Remove Razorpay
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
NEXT_PUBLIC_RAZORPAY_KEY

# Remove Calendly
CALENDLY_API_KEY
CALENDLY_ORGANIZATION
```

### Keep
```
# Firebase (all vars needed)
FIREBASE_API_KEY
FIREBASE_AUTH_DOMAIN
FIREBASE_PROJECT_ID
FIREBASE_STORAGE_BUCKET
FIREBASE_MESSAGING_SENDER_ID
FIREBASE_APP_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
```

---

## Phase 12: Update package.json Dependencies (Optional)

### Can Remove
```
razorpay
canvas-confetti
react-confetti
```

### Keep Everything Else
- Firebase dependencies
- Next.js and React
- Chart.js (used in admin dashboard)
- Puppeteer (PDF generation)
- All Python packages in report generators

---

## Phase 13: Clean Up Documentation

### Delete/Archive
```
ORPHANED_ACCOUNT_REGISTRATION_FLOW.md  (user registration flow)
ORPHANED_ACCOUNT_LOGIN_FLOW.md         (user login flow)
TENANT_CREATION.md                      (if removing multi-tenant)
```

### Update
```
README.md                               (Update to reflect new simplified app)
CLAUDE.md                               (Update architecture section)
```

---

## Execution Order (Recommended)

1. **Backup/Commit Current State**
   ```bash
   git add .
   git commit -m "Checkpoint before feature removal"
   ```

2. **Remove Assessment Pages** (Phase 1)
3. **Remove Assessment Components** (Phase 2)
4. **Remove Assessment Data** (Phase 3)
5. **Remove Payment Features** (Phase 4)
6. **Remove Calendly** (Phase 5)
7. **Test Admin Dashboard** - Ensure it still loads
8. **Decide on Multi-Tenant** (Phase 6)
9. **Update Root Page** (Phase 10)
10. **Clean Environment Variables** (Phase 11)
11. **Test Report Generation** - Ensure pipelines work
12. **Update Documentation** (Phase 13)
13. **Remove Unused Dependencies** (Phase 12) - Do this last

---

## Testing Checklist After Removal

- [ ] Admin dashboard loads at `/admin/dashboard`
- [ ] Can log in as admin
- [ ] Can view user list
- [ ] Can export user data
- [ ] Can run data normalizer
- [ ] Can run report pipeline phases
- [ ] Can download individual reports
- [ ] Can download batch reports as ZIP
- [ ] Can upload reports to Google Drive
- [ ] Python pipelines execute without errors

---

## Estimated File Count

**Directories to Delete**: ~15-20
**Files to Delete**: ~30-40
**Files to Modify**: ~5-10
**Files to Keep**: ~100+ (mostly dependencies and admin/report files)

---

## Questions to Answer Before Proceeding

1. **Multi-tenant**: Keep or remove?
2. **User Registration**: Keep `/register` or admin creates users manually?
3. **User Login**: Keep `/login` for users to view their own data, or admin-only access?
4. **Root Page**: What should `/` display?
5. **Orphaned Users Page**: Keep this admin feature?

---

## Risk Mitigation

- Work on `report-dashboard` branch (already done ✅)
- Commit after each phase
- Test admin dashboard and report generation frequently
- Keep deleted code in git history (can recover if needed)
- Consider creating a backup branch: `git checkout -b report-dashboard-backup`
