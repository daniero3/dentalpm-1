# Dental Practice Management SaaS - Madagascar

## Problem Statement
Transform dental practice management into a multi-tenant Commercial SaaS platform for the Madagascar market with local payment methods (MVola, Orange Money, etc.).

## Architecture
- **Backend**: Node.js + Express + Sequelize + SQLite
- **Frontend**: React + Shadcn/Tailwind
- **Multi-tenancy**: `clinic_id` enforcement across all models
- **Auth**: JWT + RBAC (SUPER_ADMIN, ADMIN, DENTIST, etc.)

## Completed Phases

### P0 - Critical Bug Fixes (✓)
- `clinic_id: null` enforcement via `requireClinicId` middleware
- `/openapi.json` returns JSON correctly

### P1 - Appointments Stabilization (✓)
- Time validation, default `dentist_id`, date filtering
- Cross-clinic security
- Full CRUD frontend (`AppointmentManagement.jsx`)

### P2 - Security & DB Hardening (✓)
- RBAC middleware
- Rate-limiting on login (keys by username)
- Audit logging for CUD operations
- `clinic_id` NOT NULL constraint in DB

### P2.5 - Data Standardization (✓)
- Sequential `patient_number` (PAT-XXXXXX) per clinic
- Gender normalization (M/F)

### P3 - Local Payment System (✓)
- `PaymentRequest` model
- Clinic admin submits proof → Super-admin verifies → Subscription activates
- File uploads via `multer` (PNG/JPEG/PDF, 5MB max)

### P3.5 - Payment Hardening (✓) - 2026-01-19
- **Unique constraint**: `(clinic_id, reference)` prevents duplicate submissions
- **409 Conflict**: Returned for duplicate references and already-processed requests
- **Licensing guard**: `/api/patients` blocked with 403 if subscription expired
- **Migration**: `20260120-unique-clinic-reference.js`

### P4 - Documentation (✓) - 2026-01-19
- OpenAPI spec updated with billing/admin endpoints
- `BILLING.md` created with workflow description (~10 lines)

## Key Files Modified (P3.5/P4)
- `/app/dental-pm-mvp/models/PaymentRequest.js` - unique index
- `/app/dental-pm-mvp/routes/billing.js` - 409 for duplicate reference
- `/app/dental-pm-mvp/routes/admin.js` - 409 for already-processed requests
- `/app/dental-pm-mvp/routes/patients.js` - added `requireValidSubscription`
- `/app/dental-pm-mvp/server.js` - OpenAPI spec extended
- `/app/dental-pm-mvp/BILLING.md` - new doc

## Backlog / Future
- Stripe integration (real payment gateway)
- Full frontend UI for billing pages
- Comprehensive user documentation

## Test Credentials
- **Super Admin**: admin / admin123
- **Clinic Admin**: test_clinic2 / test123

## MOCKED Components
- **Payments**: Local proof-of-payment (no live gateway)
