# Dental Practice Management - Madagascar

## Problem Statement
Multi-tenant Dental Practice Management SaaS for Madagascar market with dual-tariff pricing (SYNDICAL/CABINET), RBAC, invoicing, quotes, and payments.

## Completed Features

### P6 - Dual Tariff System ✅
- SYNDICAL: Global read-only tariff (clinic_id: NULL), SUPER_ADMIN only
- CABINET: Per-clinic customizable tariff for self-paying patients

### P6.2 - Cabinet Finalization ✅
- Full CRUD for clinic_admin CABINET tariff
- CSV import/export
- MAEVA template one-click import

### P7 - Payments ✅
- Multi-payment recording (Cash, Cheque, Card, Mobile Money)
- Payment history modal
- Status: UNPAID/PARTIAL/PAID

### P7 - Quotes ✅
- Quote lifecycle (DRAFT → SENT → ACCEPTED → CONVERTED)
- Numbering: DEV-YYYY-XXXX
- Convert to invoice functionality

### P8 - PDF Generation ✅ (2026-02-22)
- pdfkit-based PDF generation (no browser dependency)
- GET /api/invoices/:id/pdf - Premium invoice PDF
- GET /api/quotes/:id/pdf - Premium quote PDF
- Frontend "PDF" download buttons on both Invoice and Quote management

## Tech Stack
- Backend: Node.js, Express, Sequelize, SQLite
- Frontend: React, Shadcn UI, Tailwind CSS
- PDF: pdfkit (pure JS)

## Key Files
- `/app/dental-pm-mvp/utils/pdfGenerator.js` - PDF generation utilities
- `/app/dental-pm-mvp/routes/invoices.js` - Invoice routes + PDF
- `/app/dental-pm-mvp/routes/quotes.js` - Quote routes + PDF

## Credentials
- Super Admin: admin / admin123

## Future Tasks
- Real payment processor integration (Stripe/local Madagascar)
- User documentation
