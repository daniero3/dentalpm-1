# Dental Practice Management SaaS - Madagascar

## Original Problem Statement
Multi-tenant Dental Practice Management platform for Madagascar market with dual-tariff pricing (SYNDICAL/CABINET).

## Core Architecture
- **Backend**: Node.js, Express, Sequelize ORM, SQLite
- **Frontend**: React, Shadcn UI, Tailwind CSS
- **Auth**: JWT with RBAC

## Implemented Features

### P6 - Dual Tariff System ✅ COMPLETE

**Backend:**
- [x] Global SYNDICAL schedule (clinic_id: NULL)
- [x] CABINET schedules per clinic
- [x] RBAC: SYNDICAL = SUPER_ADMIN only
- [x] CSV import with detailed report
- [x] Invoice accepts global SYNDICAL

**Frontend:**
- [x] PricingSettings.jsx - CRUD complet CABINET
  - Add/Edit/Delete actes
  - Import/Export CSV
  - SYNDICAL read-only pour clinic_admin
- [x] InvoiceManagement.js - Auto-select schedule
  - payer_type display (INSURED/SELF_PAY)
  - Auto-select SYNDICAL/CABINET
  - Override warning

### Preuves validées
| Scénario | Patient | Grille | Total |
|----------|---------|--------|-------|
| 1 | INSURED | SYNDICAL | 180,000 MGA |
| 2 | SELF_PAY | CABINET | 227,500 MGA |

## Credentials
- **SUPER_ADMIN**: admin / admin123
- **CLINIC_ADMIN**: clinic_admin_test / testpass123

## Pending (Backlog)
- [ ] Intégration paiement (Stripe/local)
- [ ] Génération PDF factures
- [ ] Documentation utilisateur

## Last Updated
2026-01-19 - P6 UI Tarification CABINET + Workflow Facture complet
