# DentalPM RBAC Matrix

Derniere mise a jour: 2026-05-06

Cette matrice est le contrat d'autorisation cible pour DentalPM. Les routes doivent converger vers ces permissions explicites au lieu de simples controles de role disperses.

## Roles

- `SUPER_ADMIN`: administre la plateforme SaaS uniquement. Aucun acces aux donnees medicales des cabinets.
- `ADMIN`: administre son cabinet, ses utilisateurs, sa facturation cabinet et ses donnees medicales.
- `DENTIST`: gere les patients, actes cliniques, rendez-vous, prescriptions, devis et factures de son cabinet.
- `ASSISTANT`: gere les operations administratives courantes du cabinet, sans actions financieres sensibles.
- `ACCOUNTANT`: gere factures, devis, paiements, rapports financiers et exports comptables du cabinet.

## Permission verbs

- `read`: consulter/lister/exporter.
- `write`: creer/modifier/supprimer/desactiver.
- `execute`: lancer une action metier avec effet secondaire ou traitement en masse: importer, envoyer, valider, facturer, convertir, restaurer.

## Matrice cible

| Module | SUPER_ADMIN | ADMIN | DENTIST | ASSISTANT | ACCOUNTANT |
| --- | --- | --- | --- | --- | --- |
| Platform clinics | read/write/execute | none | none | none | none |
| Subscriptions SaaS | read/write/execute | read/execute | none | none | read |
| Cabinet settings | none | read/write/execute | read | read | read |
| Users cabinet | none | read/write/execute | read | none | none |
| Patients | none | read/write | read/write | read/write | read |
| Appointments | none | read/write/execute | read/write/execute | read/write/execute | read |
| Dental chart | none | read/write | read/write | read | none |
| Prescriptions | none | read/write/execute | read/write/execute | read | none |
| Documents patients | none | read/write/execute | read/write/execute | read/write | read |
| Pricing SYNDICAL | read | read | read | read | read |
| Pricing CABINET | none | read/write/execute | read/write/execute | read | read |
| Quotes | none | read/write/execute | read/write/execute | read/write | read/write/execute |
| Invoices | none | read/write/execute | read/write | read | read/write/execute |
| Payments | none | read/write/execute | none | none | read/write/execute |
| Reports | none | read/execute | read | none | read/execute |
| Inventory | none | read/write/execute | read | read/write | read |
| Suppliers | none | read/write | read | read/write | read |
| Purchases | none | read/write/execute | read | read/write | read/write/execute |
| Lab orders | none | read/write/execute | read/write/execute | read/write | read |
| Messaging | none | read/write/execute | read | read/write/execute | none |
| Legal docs | read | read | read | read | read |
| Audit logs | read | read | none | none | read |

## Regles non negociables

1. Toute requete medicale doit etre bornee par `clinic_id`.
2. `SUPER_ADMIN` ne doit jamais lire, creer, modifier ou exporter les donnees medicales des cabinets.
3. Un `clinic_id` fourni dans le body par le client ne doit jamais remplacer le `clinic_id` authentifie.
4. Toute creation multi-table critique doit etre atomique via transaction.
5. Toute route 5xx en production doit retourner un message generique avec `request_id`, sans stack trace ni `error.message`.
6. Les imports, envois, conversions, validations et traitements de masse exigent `execute`.

## Etat d'implementation

- `pricing`: permissions `read/write/execute` appliquees.
- `invoices`: creation verrouillee au `clinic_id` et rendue atomique pour facture + lignes.
- `patients`: isolation `clinic_id` presente, mais doit recevoir une permission explicite par verbe.
- autres modules: a aligner progressivement sur cette matrice.
