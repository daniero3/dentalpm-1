# GO-LIVE CHECKLIST - Dental PM Madagascar

## 1. Variables d'environnement PRODUCTION

### Backend (.env)
```bash
# Database PostgreSQL (OBLIGATOIRE)
DB_HOST=<PROD_DB_HOST>
DB_PORT=5432
DB_NAME=dental_pm_prod
DB_USER=<PROD_DB_USER>
DB_PASSWORD=<STRONG_PASSWORD_32_CHARS>

# Server
PORT=8001
NODE_ENV=production

# JWT (OBLIGATOIRE: changer en prod)
JWT_SECRET=<RANDOM_64_CHARS_SECRET>
JWT_EXPIRES_IN=8h

# Upload
UPLOAD_PATH=/var/data/uploads
MAX_FILE_SIZE=5242880

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50

# Madagascar
DEFAULT_CURRENCY=MGA
DEFAULT_LOCALE=fr-MG
```

### Frontend (.env)
```bash
REACT_APP_BACKEND_URL=https://app.dental-madagascar.com
```

---

## 2. Sécurité CRITIQUE

### 2.1 Changer mot de passe admin par défaut
```sql
-- Via script ou API admin
UPDATE users SET password_hash = '<BCRYPT_HASH>' 
WHERE username = 'admin';
```

Script Node.js:
```javascript
const bcrypt = require('bcrypt');
const hash = await bcrypt.hash('NEW_SECURE_PASSWORD', 12);
// Update via Sequelize
```

### 2.2 Checklist sécurité
- [ ] JWT_SECRET: 64+ caractères aléatoires
- [ ] DB_PASSWORD: 32+ caractères, pas de mots du dictionnaire
- [ ] admin123 remplacé par mot de passe fort (16+ chars, maj/min/chiffres/symboles)
- [ ] NODE_ENV=production (désactive stack traces)
- [ ] HTTPS obligatoire (certificat SSL)
- [ ] Rate limiting activé
- [ ] Logs d'audit activés

### 2.3 Headers sécurité (nginx/proxy)
```nginx
add_header X-Frame-Options "SAMEORIGIN";
add_header X-Content-Type-Options "nosniff";
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
```

---

## 3. Base de données

### 3.1 Migrations
```bash
cd /app/dental-pm-mvp
npx sequelize-cli db:migrate --env production
```

### 3.2 Seed admin (si nouveau déploiement)
```bash
npx sequelize-cli db:seed --seed admin-user --env production
```

### 3.3 Backup automatique
- Configurer backup quotidien PostgreSQL
- Rétention: 30 jours minimum
- Test de restauration mensuel

---

## 4. Uploads

### 4.1 Dossier persistant
```bash
mkdir -p /var/data/uploads/receipts
chown -R node:node /var/data/uploads
chmod 750 /var/data/uploads
```

### 4.2 Limites
- Max file size: 5MB
- Types autorisés: PNG, JPEG, PDF uniquement

---

## 5. Monitoring

### 5.1 Health check
```bash
curl https://app.dental-madagascar.com/api/health
# Attendu: {"status":"ok","timestamp":"..."}
```

### 5.2 Logs
- Backend: /var/log/dental-pm/backend.log
- Erreurs: /var/log/dental-pm/error.log
- Audit: Table audit_logs en DB

---

## 6. Pre-deploy checklist

- [ ] Backup base de données existante
- [ ] Variables .env production configurées
- [ ] JWT_SECRET unique généré
- [ ] Mot de passe admin changé
- [ ] SSL/TLS configuré
- [ ] DNS pointant vers serveur prod
- [ ] Migrations testées sur staging
- [ ] Smoke tests passés

---

## 7. Post-deploy checklist

- [ ] Health check OK
- [ ] Login admin fonctionne
- [ ] Création patient fonctionne
- [ ] Création RDV fonctionne
- [ ] Soumission paiement fonctionne
- [ ] Vérification paiement fonctionne
- [ ] Guard licensing bloque si expiré
- [ ] Logs d'erreur vides
- [ ] Backup automatique configuré
