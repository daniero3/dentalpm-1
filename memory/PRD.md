# Dental Practice Management SaaS - Madagascar

## Original Problem Statement
Multi-tenant Dental Practice Management platform for Madagascar market with:
- Patient management
- Appointment scheduling  
- Invoicing with dual-tariff pricing (SYNDICAL/CABINET)
- Subscription-based licensing
- Local proof-of-payment billing

## Core Architecture
- **Backend**: Node.js, Express, Sequelize ORM, SQLite (dev)
- **Frontend**: React, Shadcn UI, Tailwind CSS
- **Auth**: JWT with RBAC (SUPER_ADMIN, CLINIC_ADMIN, DENTIST, ASSISTANT, ACCOUNTANT)

## Key Data Models
- `PricingSchedule`: `{ clinic_id (nullable for global), type: SYNDICAL|CABINET, year, is_active }`
- `ProcedureFee`: `{ schedule_id, procedure_code, label, price_mga, category }`
- `Invoice`: `{ schedule_id (FK), patient_id, total_mga, status }`
- `Patient`: `{ payer_type: INSURED|SELF_PAY }`

## Implemented Features (P6 - Dual Tariff System)

### Backend - COMPLETED ✅
- [x] Global SYNDICAL schedule (clinic_id: NULL) - single source of truth
- [x] CABINET schedules per clinic (clinic_id: UUID)
- [x] RBAC: SYNDICAL editable only by SUPER_ADMIN
- [x] RBAC: CABINET editable by CLINIC_ADMIN of owning clinic
- [x] CSV import with detailed report (inserted, updated, ignored, deactivated)
- [x] Invoice creation accepts global SYNDICAL schedule_id
- [x] Inter-clinic coherence: all clinics see same SYNDICAL tariffs

### Credentials
- **SUPER_ADMIN**: admin / admin123
- **CLINIC_ADMIN (Clinic 1)**: clinic_admin_test / testpass123
- **CLINIC_ADMIN (Clinic 2)**: clinic2_admin_test / testpass123

### API Endpoints (Pricing)
- `GET /api/pricing-schedules` - List schedules (clinic + global SYNDICAL)
- `GET /api/pricing-schedules/:id/fees` - Get fees for a schedule
- `POST /api/pricing-schedules/:id/fees` - Add fee (SYNDICAL: SUPER_ADMIN only)
- `PUT /api/pricing-schedules/:id` - Update fee (SYNDICAL: SUPER_ADMIN only)
- `POST /api/pricing-schedules/:id/import-fees` - Import CSV (SYNDICAL: SUPER_ADMIN only)
- `DELETE /api/pricing-schedules/cleanup-syndical` - Clean old schedules (SUPER_ADMIN only)

## Pending Tasks

### P1 - Frontend Validation
- [ ] InvoiceManagement.js - test procedure autocomplete with SYNDICAL fees
- [ ] PricingSettings.jsx - implement full CRUD for CABINET tariffs
- [ ] Verify read-only mode for SYNDICAL in clinic_admin view

### P2 - Backlog
- [ ] Payment processor integration (Stripe/local)
- [ ] PDF generation for invoices
- [ ] Native PDF for patient consent forms
- [ ] User training materials

## Known Issues
- None currently

## Last Updated
2026-01-19 - P6 Backend Dual-Tariff System completed with curl proofs
