# Dental Practice Management SaaS - Madagascar

## Original Problem Statement
Multi-tenant Dental Practice Management platform for Madagascar market with:
- Patient management, Appointment scheduling
- Invoicing with dual-tariff pricing (SYNDICAL global / CABINET local)
- Subscription-based licensing, Local proof-of-payment billing
- Quotes (Devis) with conversion to invoices

## Core Architecture
- **Backend**: Node.js, Express, Sequelize ORM, SQLite (dev)
- **Frontend**: React, Shadcn UI, Tailwind CSS
- **Auth**: JWT with RBAC (SUPER_ADMIN, CLINIC_ADMIN, DENTIST, ASSISTANT, ACCOUNTANT)

## Implemented Features

### P6 - Dual Tariff System ✅
- Global SYNDICAL schedule (clinic_id: NULL) - SUPER_ADMIN only
- CABINET schedules per clinic - CLINIC_ADMIN editable
- CSV import/export with detailed report
- Invoice creation with schedule_id

### P6.2 - CABINET Tarification Complete ✅
- Template MAEVA 2026 (48 actes) - import 1-click
- Toggle actif/inactif pour actes
- Export CSV, Import CSV avec replace
- SYNDICAL read-only pour clinic_admin
- Autocomplete basé sur schedule sélectionné

### P7 - Payments System ✅
- Payment model: CASH, CHEQUE, CARD, MVOLA, ORANGE_MONEY, AIRTEL_MONEY, BANK_TRANSFER
- POST /api/invoices/:id/payments (with overpayment protection)
- GET /api/invoices/:id/payments (list + stats)
- DELETE /api/invoices/payments/:id (cancel)
- GET /api/invoices/:id/print (HTML printable)
- UI: Payment modal, history, share/print buttons

### P7 - Quotes (Devis) System ✅
- Document type: QUOTE vs INVOICE
- Numbering: DEV-YYYY-XXXX / FACT-YYYY-XXXX
- Statuses: DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED, CONVERTED
- Validity period (days)
- POST /api/quotes/:id/convert -> creates invoice
- GET /api/quotes/:id/print (HTML with watermark)
- UI: QuoteManagement.jsx with full CRUD

## API Endpoints

### Pricing
- GET /api/pricing-schedules
- GET /api/pricing-schedules/:id/fees
- POST /api/pricing-schedules/:id/fees
- PUT /api/procedure-fees/:id
- POST /api/pricing-schedules/:id/import-fees
- GET /api/pricing-schedules/:id/export-fees
- POST /api/pricing-schedules/:id/import-template-maeva

### Invoices & Payments
- GET/POST /api/invoices
- GET /api/invoices/:id
- PATCH /api/invoices/:id/status
- GET/POST /api/invoices/:id/payments
- DELETE /api/invoices/payments/:paymentId
- GET /api/invoices/:id/print

### Quotes
- GET/POST /api/quotes
- GET/PUT/DELETE /api/quotes/:id
- PATCH /api/quotes/:id/status
- POST /api/quotes/:id/convert
- GET /api/quotes/:id/print

## Credentials
- **SUPER_ADMIN**: admin / admin123
- **CLINIC_ADMIN (Clinic 1)**: clinic_admin_test / testpass123
- **CLINIC_ADMIN (Clinic 2)**: clinic2_admin_test / testpass123

## Backlog
- [ ] PDF generation for invoices/quotes
- [ ] Payment processor integration (Stripe/local)
- [ ] Patient consent forms (PDF)
- [ ] User training materials

## Last Updated
2026-01-19 - P6.2 CABINET Tarification completed
