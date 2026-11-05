# DentalPM — Fusion de la Fiche dentaire et de l'Odontogramme

Version de livraison : 4 novembre 2026 — modification du **projet Node/React `dental-pm-mvp`**.

## Résultat

- Une seule interface clinique : **Dossier dentaire**, accessible depuis la fiche du patient et la fenêtre patient de l'agenda.
- Schémas FDI permanents et temporaires (52 dents), couleurs des états, surfaces, observations, historique.
- Panneau par dent permettant l'ajout d'actes réalisés ou planifiés (catégorie, nom, date, prix en ariary, description).
- État de la dent : **une seule source de référence** (`tooth_statuses` via l'API `odontogram` existante).
- Actes déjà enregistrés dans l'ancienne table `dental_charts` **conservés et relus**. Les traitements de la table `treatments` sont aussi affichés en lecture seule.
- Ancien état présent seulement dans `dental_charts` : affiché explicitement comme **observation ancienne non confirmée**. Un praticien doit le confirmer dans l'odontogramme. Aucun écrasement automatique.
- Les liens historiques `/patients/:patientId/chart` redirigent vers `/patients/:patientId/odontogram`.
- Les API historiques restent disponibles pour compatibilité (elles ne sont pas supprimées).

## Modifications effectuées

- `dental-pm-mvp/frontend/src/components/PatientOdontogram.jsx` : écran clinique unifié.
- `dental-pm-mvp/frontend/src/components/DentalChart.js` : composant historique remplacé par un alias.
- `dental-pm-mvp/frontend/src/components/PatientManagement.jsx` : une seule action de dossier dentaire.
- `dental-pm-mvp/frontend/src/components/AppointmentManagement.jsx` : une seule action de dossier dentaire.
- `dental-pm-mvp/frontend/src/App.js` : redirection des anciennes URLs.
- `dental-pm-mvp/routes/dental-records.js` : lecture combinée et ajout d'actes avec contrôle du cabinet et transaction.
- `dental-pm-mvp/utils/dentalRecord.js` : correspondance FDI / ancien index 1–32.
- `dental-pm-mvp/server.js` : branchement des nouvelles routes sécurisées.
- `dental-pm-mvp/database/migrations/2026-11-04-unified-dental-record.sql` : création additive de la table d'archives si elle n'existe pas.
- `dental-pm-mvp/scripts/test-dental-record-node.cjs` : tests unitaires.

## Installation (sur une COPIE / STAGING en premier)

1. Faire une sauvegarde vérifiée de la base PostgreSQL et des fichiers patients de l'environnement cible.
2. Mettre à jour le code du projet sans effacer les fichiers ni la base de données existants.
3. Sur PostgreSQL **avant d'autoriser la saisie d'actes**, appliquer la migration **après vérification du schéma existant** :

   ```sh
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f dental-pm-mvp/database/migrations/2026-11-04-unified-dental-record.sql
   ```

4. Installer les dépendances et reconstruire le frontend selon l'environnement habituel de DentalPM.
5. Relancer le backend Node/Express et publier les fichiers front-end compilés.
6. Tester une fiche patient contenant des observations et des actes anciens, une dent permanente et une dent temporaire, la conservation après rechargement, et les droits multi-cabinets.

**Important** : la version fournie ne contient pas de base SQLite ni de dossiers de documents patients, exclus volontairement de l'archive de livraison. Conserver les originaux. Ne pas substituer cette archive à la sauvegarde des données.

## Tests réalisés dans l'environnement de préparation

- `node --check` sur le serveur, la nouvelle API et les utilitaires : OK.
- `node --test dental-pm-mvp/scripts/test-dental-record-node.cjs` : 4 tests validés.
- Analyse de syntaxe TS/JSX des composants React modifiés : OK.

**Non exécutés ici** : `npm run build`, serveur connecté à PostgreSQL, migration réelle, tests end-to-end du navigateur ; l'environnement de préparation ne dispose pas des dépendances Node installées ni des identifiants de la base cible. Une mise en production nécessite ces validations.

## Limites volontaires

- Aucune migration automatique ou destructive des états anciens n'est effectuée.
- Les actes historiques restent dans leur table initiale, pour préserver l'auditabilité ; l'écran les agrège sans les déplacer.
- Les traitements structurés existants sont affichés en lecture seule ; le nouvel acte est ajouté dans `dental_charts`, pas dans le workflow devis/factures.
- La migration SQL concerne PostgreSQL, conformément à `database/connection.js` dans la version fournie. Le fichier SQLite présent dans l'archive initiale n'est pas utilisé par ce backend. Il ne faut pas supposer qu'il s'agit de la base de production.
