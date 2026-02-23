# 📘 Guide Utilisateur - Dental Practice Management Madagascar

## 🔐 Connexion & Rôles

### Connexion
1. Accédez à l'URL de l'application
2. Entrez votre **identifiant** et **mot de passe**
3. Cliquez sur **Se connecter**

### Rôles disponibles
| Rôle | Accès |
|------|-------|
| **SUPER_ADMIN** | Administration globale, toutes cliniques, tarifs SYNDICAL |
| **CLINIC_ADMIN** | Gestion complète de sa clinique |
| **DENTIST** | Patients, RDV, soins, prescriptions |
| **SECRETARY** | Patients, RDV, facturation |
| **ACCOUNTANT** | Facturation, paiements, rapports |

---

## 👥 Patients

### Créer un patient
1. Menu **Patients** → **+ Nouveau patient**
2. Remplir : Nom, Prénom, Date naissance, Téléphone, Email
3. Consentements : SMS, Email (optionnel)
4. **Enregistrer**

### Fiche patient
- **Onglet Documents** : Télécharger radios, documents
- **Onglet Ordonnances** : Créer/gérer prescriptions
- **Onglet Odontogramme** : Schéma dentaire visuel
- **Onglet Labo** : Commandes prothèses

---

## 📅 Rendez-vous

### Créer un RDV
1. Menu **Rendez-vous** → **+ Nouveau RDV**
2. Sélectionner : Patient, Date, Heure début/fin, Type
3. Ajouter motif (optionnel)
4. **Enregistrer**

> 💡 Un **SMS de rappel T-24h** est automatiquement créé si le patient a activé les SMS.

### Statuts RDV
- **SCHEDULED** : Planifié
- **CONFIRMED** : Confirmé
- **COMPLETED** : Terminé
- **CANCELLED** : Annulé
- **NO_SHOW** : Absent

---

## 💰 Devis → Facture → Paiements

### Créer un devis
1. Menu **Devis** → **+ Nouveau devis**
2. Sélectionner patient + ajouter actes (tarif automatique)
3. **Enregistrer** (statut DRAFT)
4. **Envoyer** au patient (statut SENT)

### Convertir en facture
1. Ouvrir le devis accepté
2. Cliquer **Convertir en facture**
3. Une facture FACT-YYYY-XXXX est créée

### Enregistrer un paiement
1. Menu **Factures** → Ouvrir la facture
2. **+ Paiement** → Montant, Mode (Espèces/Chèque/CB/Mobile Money)
3. Le statut passe automatiquement : UNPAID → PARTIAL → PAID

### Télécharger PDF
- Cliquer l'icône **PDF** sur la facture ou le devis
- Le PDF inclut : logo clinique, détails, QR code paiement (si solde > 0)

### Filtrer les factures
- Boutons : **Toutes** | **Impayées** | **Partielles** | **Payées**

---

## 📋 Tarifs SYNDICAL / CABINET

### Tarif SYNDICAL (lecture seule)
- Tarif national géré par SUPER_ADMIN
- Visible par toutes les cliniques

### Tarif CABINET (personnalisable)
1. Menu **Paramètres** → **Tarification**
2. Onglet **CABINET** → Modifier les prix
3. **Import CSV** : Importer tarifs en masse
4. **Template MAEVA** : Charger le modèle standard

---

## 📦 Achats → Inventaire

### Créer un bon de commande
1. Menu **Achats** → **+ Nouveau bon**
2. Sélectionner fournisseur
3. Ajouter produits + quantités + prix unitaires
4. **Créer** (statut DRAFT)

### Réceptionner une commande
1. Cliquer **Réceptionner** sur le bon DRAFT
2. Le stock est automatiquement mis à jour
3. Statut passe à RECEIVED

### Consulter l'inventaire
- Menu **Inventaire** → Liste des produits avec quantités actuelles

---

## 📄 Documents, Ordonnances, Odontogramme

### Documents patient
1. Fiche patient → Onglet **Documents**
2. **+ Upload** → Sélectionner fichier (radio, scan, etc.)
3. Catégories : Radio, Scan, Consentement, Autre

### Ordonnances
1. Fiche patient → Onglet **Ordonnances**
2. **+ Nouvelle** → Saisir médicaments/posologie
3. Statuts : DRAFT → ISSUED → DISPENSED

### Odontogramme
1. Fiche patient → Onglet **Odontogramme**
2. Cliquer sur une dent → Sélectionner état
3. États : Sain, Carie, Obturé, Absent, Couronne, etc.

---

## 🔬 Laboratoire & Rapports

### Commandes labo
1. Menu **Laboratoire** ou Fiche patient → Onglet **Labo**
2. **+ Nouvelle commande** → Type prothèse, instructions
3. Suivre statuts : ORDERED → IN_PROGRESS → READY → DELIVERED

### Rapports financiers
1. Menu **Rapports**
2. Visualiser : CA, paiements, factures impayées
3. Filtrer par période

---

## 📧 Mailing / SMS

### Templates
1. Menu **Mailing** → Onglet **Templates**
2. **+ Nouveau** → Clé (APPT_REMINDER_24H, BIRTHDAY), texte
3. Variables : `{patient_name}`, `{date}`, `{time}`, `{clinic_name}`

### File d'attente
- Messages en attente d'envoi (rappels RDV, anniversaires)

### Exécuter envoi (test)
- Cliquer **Exécuter envoi** pour simuler l'envoi des messages en attente

> ⚠️ **Mode simulation** : Aucun SMS/Email réel n'est envoyé. Intégration opérateur à venir.

---

## 🔧 Dépannage

### Erreur 403 - Abonnement expiré
**Cause** : Votre abonnement clinique est inactif ou expiré.
**Solution** : 
1. Contacter l'administrateur
2. Menu **Paiement/Abonnement** → Renouveler

### PDF ne se télécharge pas
**Cause** : Erreur serveur ou données manquantes.
**Solutions** :
1. Vérifier que la facture/devis a des lignes
2. Rafraîchir la page et réessayer
3. Vérifier les logs serveur si admin

### Upload fichier échoue
**Cause** : Fichier trop volumineux ou format non supporté.
**Solutions** :
1. Taille max : 10 MB
2. Formats acceptés : PDF, JPG, PNG, JPEG
3. Réduire la taille du fichier si nécessaire

### Patient/Facture non trouvé
**Cause** : Isolation multi-tenant - vous n'avez accès qu'à votre clinique.
**Solution** : Vérifier que vous êtes connecté avec le bon compte clinique.

### SMS non envoyés
**Cause** : Mode simulation actif (pas d'intégration opérateur).
**Note** : Les messages sont enregistrés dans la file d'attente et les logs.

---

## 📞 Support

- **Email** : support@dentalpractice.mg
- **Documentation technique** : `/app/memory/PRD.md`

---

*Version 1.0 - Février 2026*
