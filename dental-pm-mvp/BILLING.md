# Workflow de Paiement Local (Madagascar)

## Flux
1. **Admin clinique** → POST `/api/billing/payment-requests` (plan, méthode, référence, reçu)
2. **Système** → Crée demande avec statut `PENDING`
3. **Super-admin** → GET `/api/admin/payment-requests?status=PENDING` → Liste demandes
4. **Super-admin** → PATCH `/api/admin/payment-requests/:id/verify` → Valide et active abonnement (30j)
5. **Super-admin** → PATCH `/api/admin/payment-requests/:id/reject` → Rejette avec motif

## Méthodes acceptées
MVola, Orange Money, Airtel Money, Virement bancaire, Espèces

## Contraintes
- Une seule demande `PENDING` par clinique
- Référence unique par clinique (évite doublons)
- Fichiers: PNG/JPEG/PDF, max 5MB
