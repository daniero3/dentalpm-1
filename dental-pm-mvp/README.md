# Dental Practice Management System - Madagascar 🦷

Un système de gestion de cabinet dentaire moderne conçu spécifiquement pour Madagascar, avec support pour la devise locale (MGA), les intégrations SMS et Mobile Money.

## 🏗️ Architecture

- **Backend**: Node.js + Express + PostgreSQL + Sequelize ORM
- **Frontend**: React (à venir)
- **Base de données**: PostgreSQL avec Docker
- **Authentication**: JWT
- **Intégrations**: SMS mockées, Mobile Money mocké

## 🌟 Fonctionnalités

### ✅ Gestion des Patients
- Fiche patient complète avec informations médicales
- Historique des traitements et rendez-vous
- Fiche dentaire avec schéma des 32 dents
- Recherche et filtrage avancés

### ✅ Facturation en MGA
- Factures conformes aux standards malgaches (NIF/STAT)
- Système de remises (-15% syndical, -20% humanitaire, -10% engagement)
- Support des paiements Mobile Money (Mvola, Orange Money, Airtel Money)
- Génération automatique des numéros de facture

### ✅ Gestion des Rendez-vous
- Calendrier multi-praticiens
- Vérification des conflits d'horaires
- Rappels SMS automatiques
- Suivi des statuts (programmé, confirmé, terminé, etc.)

### ✅ Traitements Dentaires
- Catalogue complet des procédures
- Enregistrement des traitements par dent
- Notes et suivi post-traitement
- Calcul des coûts

### ✅ Intégrations Madagascar
- **SMS**: Support Telma, Orange, Airtel (mockés)
- **Mobile Money**: Mvola, Orange Money, Airtel Money (mockés)
- **Devises**: Ariary malgache (MGA) partout
- **Réglementations**: Champs NIF/STAT obligatoires

### ✅ Dashboard & Rapports
- KPIs en temps réel
- Graphiques de revenus
- Activités récentes
- Statistiques par période

## 🚀 Installation & Configuration

### Prérequis
- Node.js 18+ 
- Docker & Docker Compose
- Git

### 1. Cloner et installer
```bash
cd /app/dental-pm-mvp
npm install
```

### 2. Démarrer PostgreSQL
```bash
docker-compose up -d postgres
```

### 3. Configurer l'environnement
```bash
cp .env.example .env
# Vérifier la configuration dans .env
```

### 4. Initialiser la base de données
```bash
npm run seed
```

### 5. Démarrer le serveur
```bash
# Mode développement avec hot reload
npm run dev

# Mode production
npm start
```

Le serveur sera accessible sur `http://localhost:3001`

## 🧪 API Testing

### Health Check
```bash
curl http://localhost:3001/api/health
```

### Authentication
```bash
# Register new user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_user",
    "email": "test@dentalpm.mg",
    "password": "test123",
    "full_name": "Dr. Test User",
    "role": "DENTIST"
  }'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "dr_rakoto",
    "password": "dentist123"
  }'
```

### Patients
```bash
# Get all patients (need authentication token)
curl -X GET http://localhost:3001/api/patients \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Create patient
curl -X POST http://localhost:3001/api/patients \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Noro",
    "last_name": "Rakoto",
    "date_of_birth": "1990-05-15",
    "gender": "FEMALE",
    "phone_primary": "+261 32 12 345 67",
    "address": "Lot II M 25 Antananarivo 101, Madagascar",
    "emergency_contact_name": "Paul Rakoto",
    "emergency_contact_phone": "+261 34 98 765 43"
  }'
```

### Invoices
```bash
# Create invoice
curl -X POST http://localhost:3001/api/invoices \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "PATIENT_UUID",
    "items": [{
      "description": "Consultation initiale",
      "quantity": 1,
      "unit_price_mga": 25000
    }],
    "discount_percentage": 15,
    "discount_type": "SYNDICAL",
    "nif_number": "NIF123456",
    "stat_number": "STAT789012"
  }'
```

## 📱 Intégrations Mockées

### SMS (Madagascar Carriers)
```bash
# Send SMS
curl -X POST http://localhost:3001/api/integrations/sms/send \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+261 32 12 345 67",
    "message": "Bonjour, rappel de votre RDV demain à 9h00",
    "message_type": "APPOINTMENT_REMINDER",
    "patient_id": "PATIENT_UUID"
  }'
```

### Mobile Money
```bash
# Process payment
curl -X POST http://localhost:3001/api/integrations/mobile-money/process-payment \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+261 32 12 345 67",
    "amount_mga": 75000,
    "provider": "MVOLA",
    "invoice_id": "INVOICE_UUID"
  }'
```

## 👥 Comptes de Test

Le seeding crée automatiquement ces comptes :

| Rôle | Username | Password | Description |
|------|----------|----------|-------------|
| Admin | `admin` | `admin123` | Administrateur système |
| Dentiste | `dr_rakoto` | `dentist123` | Dr. Jean Rakoto |
| Dentiste | `dr_rasoanaivo` | `dentist123` | Dr. Marie Rasoanaivo |
| Assistante | `secretary` | `secretary123` | Noro Randriamampionona |
| Comptable | `accountant` | `accountant123` | Hery Andriamanana |

## 📊 Dashboard KPIs

Accès aux statistiques : `GET /api/dashboard/kpi`

- Nombre total de patients
- Revenus en MGA (mensuel, annuel)
- Factures en attente
- Rendez-vous du mois
- Traitements complétés

## 🗃️ Structure de la Base de Données

### Tables Principales
- `users` - Utilisateurs du système
- `patients` - Patients avec numérotation automatique
- `appointments` - Rendez-vous avec calendrier
- `treatments` - Traitements par dent
- `procedures` - Catalogue des procédures
- `invoices` - Factures avec numérotation MGA
- `invoice_items` - Articles de factures
- `payments` - Paiements avec Mobile Money
- `sms_logs` - Historique des SMS
- `audit_logs` - Journal d'audit complet

## 🔧 Scripts Utiles

```bash
# Réinitialiser la base de données
npm run seed

# Migration manuelle
npm run db:migrate

# Tests (à venir)
npm test

# Logs du serveur
tail -f logs/app.log

# Accès direct à PostgreSQL
docker exec -it dental_pm_postgres psql -U dental_admin -d dental_pm_madagascar
```

## 🛠️ Gestion avec Adminer

Interface web pour la base de données : `http://localhost:8080`

- **Système** : PostgreSQL
- **Serveur** : postgres
- **Utilisateur** : dental_admin
- **Mot de passe** : dental_pass_2024
- **Base** : dental_pm_madagascar

## 🌍 Spécificités Madagascar

### Formats de Données
- **Téléphone** : `+261 XX XX XXX XX` (validation automatique)
- **Devise** : Ariary malgache (MGA) partout
- **NIF/STAT** : Champs obligatoires sur factures
- **Langues** : Français, Malgache, Anglais

### Opérateurs Supportés
- **Telma** : +261 32/33
- **Orange** : +261 32/33  
- **Airtel** : +261 34

### Remises Locales
- **Syndical** : -15%
- **Humanitaire/Rural** : -20%
- **Engagement long terme** : -10%

## 🚧 Développement

### Ajout de Nouvelles Fonctionnalités
1. Modèles dans `/models`
2. Routes dans `/routes` 
3. Middleware dans `/middleware`
4. Tests dans `/tests` (à créer)

### Structure des Fichiers
```
dental-pm-mvp/
├── database/           # Configuration DB + seeds
├── models/            # Modèles Sequelize
├── routes/            # Routes API Express
├── middleware/        # Middlewares (auth, validation)
├── utils/             # Utilitaires
├── uploads/           # Fichiers uploadés
├── server.js          # Point d'entrée
├── package.json       # Dépendances
└── README.md         # Cette documentation
```

## 📈 Roadmap

### Phase 1 - MVP Backend ✅
- [x] API complète pour patients, factures, rendez-vous
- [x] Authentication JWT
- [x] Base de données PostgreSQL
- [x] Intégrations mockées (SMS, Mobile Money)
- [x] Dashboard KPIs

### Phase 2 - Frontend React 🚧
- [ ] Interface utilisateur responsive
- [ ] Calendrier des rendez-vous
- [ ] Fiche dentaire interactive
- [ ] Génération PDF des factures

### Phase 3 - Intégrations Réelles 🔄
- [ ] API SMS opérateurs malgaches
- [ ] API Mobile Money réelles
- [ ] Synchronisation bancaire
- [ ] Exports comptables

### Phase 4 - Features Avancées 🔜
- [ ] Télémédecine
- [ ] App mobile patient
- [ ] IA pour diagnostic d'aide
- [ ] Multi-cliniques

## 🐛 Support & Bugs

Pour signaler des problèmes ou demander des fonctionnalités :
1. Créer une issue avec description détaillée
2. Inclure les logs d'erreur
3. Spécifier l'environnement (dev/prod)

## 📄 Licence

MIT License - Libre d'utilisation pour cabinets dentaires malgaches.

---
*Système développé spécialement pour les cabinets dentaires de Madagascar 🇲🇬*