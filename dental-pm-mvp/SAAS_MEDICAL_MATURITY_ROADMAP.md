# DentalPM Medical SaaS Maturity Roadmap

Derniere mise a jour: 2026-05-06

## Verdict actuel

DentalPM est un MVP SaaS avance avec de bonnes bases multi-tenant, mais il ne doit pas encore etre considere comme une plateforme SaaS medicale professionnelle mature sans reserves.

Objectif: atteindre un niveau vendable B2B medical en fermant d'abord tous les criteres critiques, puis les differenciateurs commerciaux, puis les preuves de maturite.

## Niveau 1 - Critique

### Securite applicative

- Fait: JWT avec expiration, login rate limiting, Helmet, CORS limite, validation serveur partielle.
- Fait: masquage transversal des details d'erreur 5xx en production.
- Fait: `X-Powered-By` desactive, `X-Request-Id` ajoute, API en `Cache-Control: no-store`.
- Fait: enforcement HTTPS configurable par `REQUIRE_HTTPS=true` ou `NODE_ENV=production`.
- A faire: remplacer tous les retours explicites `details: error.message` par une helper API commune.
- A faire: verifier les en-tetes HTTPS/CSP en production via test runtime.
- A faire: politique de secrets et rotation `JWT_SECRET`, Stripe, SMTP.

Preuve attendue:
- Capture headers production.
- Tests de routes 500 confirmant absence de stack trace/details.
- Checklist secrets et procedure de rotation.

### Multi-tenant, RBAC et permissions

- Fait: isolation par `clinic_id` sur les routes medicales principales.
- Fait: blocage `SUPER_ADMIN` sur donnees medicales.
- Fait: permissions `read/write/execute` sur les grilles tarifaires.
- Fait: matrice RBAC cible versionnee dans `RBAC_MATRIX.md`.
- Fait: tests unitaires de base sur la matrice RBAC.
- Fait: `pricing` aligne sur la matrice RBAC; le `SUPER_ADMIN` ne liste plus les grilles cabinet.
- Fait: creation de facture verrouillee sur patient du meme `clinic_id`.
- Fait: middleware `requireModuleAccess()` branche sur les modules patients, rendez-vous, factures, devis, stock, fournisseurs, labo, mailing, documents, prescriptions, rapports, messaging et achats.
- Fait: permissions `execute` branchees sur paiements, conversion devis, reception achat, emission/annulation ordonnance et changement statut labo.
- Fait: premiers tests d'integration multi-tenant sur creation de facture, patient hors cabinet, grille tarifaire hors cabinet, lecture/modification patient hors cabinet et creation patient forcee sur le cabinet authentifie.
- Fait: le dossier dentaire patient filtre aussi les traitements par `clinic_id`.
- A faire: etendre les tests d'integration API d'acces croise aux devis, documents, prescriptions, stock, labo, paiements et rapports.

Preuve attendue:
- Tests API: un utilisateur du cabinet A ne lit/modifie jamais cabinet B.
- Document `RBAC_MATRIX.md`.

### Fiabilite des donnees

- Fait: migrations versionnees presentes.
- Fait: transactions atomiques sur certains mouvements de stock.
- Fait: creation de facture atomique avec facture, lignes et audit log dans une transaction.
- A faire: transactions sur creation devis/paiement et tout autre flux multi-table.
- A faire: soft delete/paranoid ou `is_active` coherent sur donnees metier sensibles.
- A faire: job backup automatise + test de restauration.
- A faire: migration runner complet et idempotent au deploiement.

Preuve attendue:
- Rapport de restauration backup.
- Tests de rollback transaction.
- Liste des tables avec strategie deletion.

## Niveau 2 - Important

### UX et PWA

- Fait: UI responsive, etats de chargement frequents, PWA installee.
- Fait: bandeau hors ligne global.
- Fait: service worker renvoie `503 OFFLINE` sur API indisponible.
- A faire: brouillons locaux pour formulaires critiques.
- A faire: file de retry offline pour sauvegardes non destructives.
- A faire: messages d'erreur uniformises avec `request_id`.
- A faire: budget performance et mesure Lighthouse.

### Qualite API

- Fait: codes HTTP globalement presents.
- Fait: rate limiting global et login.
- A faire: OpenAPI/Swagger.
- A faire: pagination uniforme.
- A faire: conventions API: erreurs, request_id, codes metier.
- A faire: tests de non-regression API.

### Observabilite

- Fait: `/api/health` minimal.
- Fait: logs d'erreur non captures avec `request_id`.
- A faire: Sentry backend/frontend.
- A faire: logs structures pour requetes importantes.
- A faire: status page.
- A faire: alerting uptime et erreurs 5xx.

## Niveau 3 - Commercial

### Documentation

- Fait: CGU, Privacy, mentions legales, runbook, guide utilisateur.
- A faire: changelog public.
- A faire: FAQ support.
- A faire: documentation API.
- A faire: guide onboarding cabinet.

### Modele economique et donnees

- Fait: plans tarifaires et Stripe.
- Fait: export CSV tarifs.
- A faire: export complet donnees cabinet.
- A faire: politique d'annulation et suppression de donnees operationnelle.
- A faire: factures abonnement automatisees et telechargeables.

## Ordre de livraison recommande

1. Semaine 1: erreurs production, session expiree, HTTPS, request_id, audit des routes sensibles.
2. Semaine 2: tests multi-tenant + matrice RBAC + permissions par module critique.
3. Semaine 3: backups automatiques + restore drill + transactions facturation/devis.
4. Semaine 4: OpenAPI + Sentry + status page + logs structures.
5. Semaine 5: PWA offline avancee + exports donnees + documentation commerciale.

## Definition de "pret a vendre"

La plateforme est consideree mature quand:

- Aucun critere critique n'est ouvert.
- Les tests multi-tenant sont automatises.
- Les erreurs production ne revelent aucun detail interne.
- Un backup restore a ete teste avec succes.
- Les roles et permissions sont documentes et testes.
- Une panne reseau ou une session expiree produit une experience controlee.
- Monitoring, status page et documentation client existent.
