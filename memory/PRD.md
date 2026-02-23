# DentalPM Madagascar - Product Requirements Document

## Original Problem Statement
Application SaaS de gestion de cabinet dentaire pour Madagascar (DentalPM).

## Core Features (Implemented)
- **Patient Management**: CRUD patients, odontogramme, historique médical
- **Billing**: Factures, devis, paiements partiels, grilles tarifaires (SYNDICAL/CABINET)
- **Inventory**: Gestion stock, alertes seuil, mouvements
- **Appointments**: Calendrier rendez-vous, rappels
- **Suppliers**: Gestion fournisseurs, bons de commande
- **Messaging**: Rappels SMS/Email (simulé), templates
- **Reports**: Tableau de bord, statistiques
- **Multi-tenancy**: Isolation par clinic_id
- **SaaS**: Onboarding, trial 7 jours, renouvellement

## Tech Stack
- **Backend**: Node.js, Express.js, Sequelize, SQLite
- **Frontend**: React, Tailwind CSS, Shadcn UI
- **Auth**: JWT
- **PDF**: pdfkit, qrcode

## Design Sprint Completed (Dec 2025)

### Theme Global Appliqué
- Background: #F7F8FA
- Primary: Teal #0F7E8A
- Accent: #2563EB
- Cards: blanches avec border-radius 12px, light shadows
- Typography: Inter font

### Pages Redessinées
1. **LoginForm.js** - Design premium avec footer
2. **PatientManagement.js** - Cards, table, boutons premium
3. **InvoiceManagement.js** - Liste + filtres statut premium

### Footer Ajouté
"© Daniero Global LLC — DentalPM Madagascar"
- Dans MainLayout (toutes pages internes)
- Sur page Login

## Credentials Test
- Super Admin: admin / admin123
- Clinic Admin: clinic_admin_test / testpass123

## What's Mocked
- Payment gateway (PaymentRequest model only)
- SMS/Email sending (simulated)

## Future Tasks
- P??: Integration paiement réel (Stripe ou Mobile Money Madagascar)
- P??: Calendrier avancé avec synchronisation
- P??: Tests end-to-end complets
