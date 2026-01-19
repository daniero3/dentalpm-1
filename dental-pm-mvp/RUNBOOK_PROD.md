# RUNBOOK PRODUCTION - Dental PM Madagascar

## 1. Contacts & Escalation

| Niveau | Contact | Délai |
|--------|---------|-------|
| L1 - Support | support@dental-madagascar.com | < 1h |
| L2 - Tech Lead | tech@dental-madagascar.com | < 4h |
| L3 - Urgence | +261 34 00 000 00 | Immédiat |

---

## 2. Procédures Incidents

### 2.1 Service Backend DOWN

**Symptômes**: API 502/503, health check échoue

```bash
# 1. Vérifier status
sudo supervisorctl status backend

# 2. Voir logs récents
tail -100 /var/log/supervisor/backend.err.log

# 3. Redémarrer service
sudo supervisorctl restart backend

# 4. Vérifier recovery
curl -s https://app.dental-madagascar.com/api/health
```

**Si échec persistant**: Escalader L2, voir section Rollback.

---

### 2.2 Service Frontend DOWN

**Symptômes**: Page blanche, erreurs JS console

```bash
# 1. Vérifier status
sudo supervisorctl status frontend

# 2. Rebuild si nécessaire
cd /app/frontend && yarn build

# 3. Redémarrer
sudo supervisorctl restart frontend
```

---

### 2.3 Base de données inaccessible

**Symptômes**: Erreurs connexion DB, timeout

```bash
# 1. Vérifier PostgreSQL
sudo systemctl status postgresql

# 2. Tester connexion
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1;"

# 3. Redémarrer si nécessaire
sudo systemctl restart postgresql

# 4. Vérifier espace disque
df -h /var/lib/postgresql
```

---

### 2.4 Erreurs 403 massives (Licensing)

**Symptômes**: Tous utilisateurs bloqués

```bash
# 1. Vérifier subscriptions actives
psql -c "SELECT COUNT(*) FROM subscriptions WHERE status='ACTIVE';"

# 2. Si problème middleware, rollback
# Voir section 3
```

---

## 3. Procédure Rollback

### 3.1 Rollback Application (< 5 min)

```bash
# 1. Lister commits récents
cd /app && git log --oneline -10

# 2. Identifier commit stable
STABLE_COMMIT="abc1234"

# 3. Rollback
git checkout $STABLE_COMMIT

# 4. Redémarrer services
sudo supervisorctl restart backend frontend

# 5. Vérifier
curl -s https://app.dental-madagascar.com/api/health
```

### 3.2 Rollback Migration DB

```bash
# 1. Lister migrations
cd /app/dental-pm-mvp
npx sequelize-cli db:migrate:status

# 2. Undo dernière migration
npx sequelize-cli db:migrate:undo

# 3. Vérifier intégrité
psql -c "SELECT COUNT(*) FROM patients;"
```

---

## 4. Restauration Backup

### 4.1 Restauration Complète DB

```bash
# 1. Arrêter services
sudo supervisorctl stop backend

# 2. Identifier backup
ls -la /var/backups/dental-pm/

# 3. Restaurer (remplacer DATE)
BACKUP_FILE="/var/backups/dental-pm/dental_pm_prod_YYYYMMDD_HHMMSS.sql.gz"
gunzip -c $BACKUP_FILE | psql -h $DB_HOST -U $DB_USER -d dental_pm_prod

# 4. Redémarrer
sudo supervisorctl start backend

# 5. Vérifier données
curl -s https://app.dental-madagascar.com/api/health
```

### 4.2 Restauration Partielle (table spécifique)

```bash
# 1. Extraire table du backup
gunzip -c $BACKUP_FILE | grep -A 1000 "COPY patients" | head -1000 > /tmp/patients_restore.sql

# 2. Restaurer
psql -h $DB_HOST -U $DB_USER -d dental_pm_prod < /tmp/patients_restore.sql
```

### 4.3 Restauration Fichiers Uploads

```bash
# 1. Localiser backup uploads
UPLOAD_BACKUP="/var/backups/dental-pm/uploads_YYYYMMDD.tar.gz"

# 2. Restaurer
cd /var/data
tar -xzf $UPLOAD_BACKUP

# 3. Vérifier permissions
chown -R node:node /var/data/uploads
```

---

## 5. Rotation Secrets

### 5.1 Rotation JWT_SECRET (planifiée)

**Fréquence**: Tous les 90 jours

```bash
# 1. Générer nouveau secret
NEW_SECRET=$(openssl rand -hex 32)

# 2. Mettre à jour .env
sed -i "s/JWT_SECRET=.*/JWT_SECRET=$NEW_SECRET/" /app/dental-pm-mvp/.env

# 3. Redémarrer backend
sudo supervisorctl restart backend

# NOTE: Les sessions existantes seront invalidées
# Prévoir communication utilisateurs
```

### 5.2 Rotation DB Password (urgence)

```bash
# 1. Changer mot de passe PostgreSQL
psql -c "ALTER USER dental_admin WITH PASSWORD 'NEW_STRONG_PASSWORD';"

# 2. Mettre à jour .env
sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=NEW_STRONG_PASSWORD/" /app/dental-pm-mvp/.env

# 3. Redémarrer
sudo supervisorctl restart backend
```

### 5.3 Rotation Admin Password

```bash
# Via script Node.js
cd /app/dental-pm-mvp
node -e "
const bcrypt = require('bcrypt');
const { User } = require('./models');
(async () => {
  const hash = await bcrypt.hash('NEW_ADMIN_PASSWORD', 12);
  await User.update({ password_hash: hash }, { where: { username: 'admin' } });
  console.log('Admin password updated');
})();
"
```

---

## 6. Monitoring & Alertes

### 6.1 Health Check Automatique

```bash
# Cron job (toutes les 5 min)
*/5 * * * * curl -sf https://app.dental-madagascar.com/api/health || echo "ALERT: Backend DOWN" | mail -s "CRITICAL" tech@dental-madagascar.com
```

### 6.2 Disk Space Alert

```bash
# Cron job (quotidien)
0 8 * * * [ $(df /var/data | tail -1 | awk '{print $5}' | tr -d '%') -gt 80 ] && echo "Disk > 80%" | mail -s "WARNING" tech@dental-madagascar.com
```

### 6.3 Logs à surveiller

| Log | Chemin | Criticité |
|-----|--------|-----------|
| Backend errors | /var/log/supervisor/backend.err.log | HIGH |
| Auth failures | audit_logs table (action='LOGIN_FAILED') | MEDIUM |
| DB slow queries | /var/log/postgresql/postgresql-*.log | LOW |

---

## 7. Checklist Post-Incident

- [ ] Incident documenté (date, durée, impact)
- [ ] Root cause identifié
- [ ] Fix appliqué et testé
- [ ] Communication utilisateurs (si impact > 30 min)
- [ ] Post-mortem planifié (si critique)
- [ ] Amélioration monitoring ajoutée
