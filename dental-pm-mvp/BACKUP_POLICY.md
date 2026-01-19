# POLITIQUE DE BACKUP - Dental PM Madagascar

## 1. Stratégie de Backup

### 1.1 Périmètre

| Donnée | Type | Criticité |
|--------|------|-----------|
| Base PostgreSQL | Full dump | CRITIQUE |
| Fichiers uploads | Tar archive | HAUTE |
| Configuration .env | Copie | MOYENNE |
| Logs applicatifs | Rotation | BASSE |

---

## 2. Fréquence & Rétention

### 2.1 Base de données

| Type | Fréquence | Rétention | Stockage |
|------|-----------|-----------|----------|
| Full backup | Quotidien 02:00 | 30 jours | Local + S3 |
| Incremental | Toutes les 6h | 7 jours | Local |
| Point-in-time | Continu (WAL) | 7 jours | Local |

### 2.2 Fichiers uploads

| Type | Fréquence | Rétention | Stockage |
|------|-----------|-----------|----------|
| Full backup | Hebdomadaire (Dim 03:00) | 12 semaines | S3 |
| Incremental | Quotidien | 7 jours | Local |

### 2.3 Configuration

| Type | Fréquence | Rétention |
|------|-----------|-----------|
| .env files | À chaque modification | 10 versions |
| nginx config | À chaque modification | 10 versions |

---

## 3. Scripts de Backup

### 3.1 Backup PostgreSQL Quotidien

```bash
#!/bin/bash
# /usr/local/bin/backup_db.sh

BACKUP_DIR="/var/backups/dental-pm/db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="dental_pm_prod"
DB_USER="dental_admin"
RETENTION_DAYS=30

# Créer backup
pg_dump -h localhost -U $DB_USER -Fc $DB_NAME > "$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.dump"

# Compresser
gzip "$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.dump"

# Upload S3 (optionnel)
# aws s3 cp "$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.dump.gz" s3://dental-pm-backups/db/

# Nettoyer anciens backups
find $BACKUP_DIR -name "*.dump.gz" -mtime +$RETENTION_DAYS -delete

echo "$(date): Backup DB completed - ${DB_NAME}_${TIMESTAMP}.dump.gz"
```

### 3.2 Backup Uploads Hebdomadaire

```bash
#!/bin/bash
# /usr/local/bin/backup_uploads.sh

BACKUP_DIR="/var/backups/dental-pm/uploads"
UPLOAD_DIR="/var/data/uploads"
TIMESTAMP=$(date +%Y%m%d)
RETENTION_WEEKS=12

# Créer archive
tar -czf "$BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz" -C /var/data uploads/

# Upload S3
# aws s3 cp "$BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz" s3://dental-pm-backups/uploads/

# Nettoyer (12 semaines = 84 jours)
find $BACKUP_DIR -name "uploads_*.tar.gz" -mtime +84 -delete

echo "$(date): Backup uploads completed"
```

### 3.3 Cron Configuration

```cron
# /etc/cron.d/dental-pm-backup

# Backup DB quotidien à 02:00
0 2 * * * root /usr/local/bin/backup_db.sh >> /var/log/dental-pm/backup.log 2>&1

# Backup uploads dimanche 03:00
0 3 * * 0 root /usr/local/bin/backup_uploads.sh >> /var/log/dental-pm/backup.log 2>&1

# Vérification backup quotidien 08:00
0 8 * * * root /usr/local/bin/verify_backup.sh >> /var/log/dental-pm/backup.log 2>&1
```

---

## 4. Test de Restauration

### 4.1 Fréquence

| Test | Fréquence | Responsable |
|------|-----------|-------------|
| Restauration DB (staging) | Mensuel | Tech Lead |
| Restauration complète | Trimestriel | Tech Lead |
| DR drill (disaster recovery) | Annuel | Direction |

### 4.2 Procédure Test Mensuel

```bash
#!/bin/bash
# /usr/local/bin/test_restore.sh

# 1. Créer DB temporaire
createdb -h localhost -U dental_admin dental_pm_test_restore

# 2. Restaurer dernier backup
LATEST_BACKUP=$(ls -t /var/backups/dental-pm/db/*.dump.gz | head -1)
gunzip -c $LATEST_BACKUP | pg_restore -h localhost -U dental_admin -d dental_pm_test_restore

# 3. Vérifier intégrité
PATIENT_COUNT=$(psql -h localhost -U dental_admin -d dental_pm_test_restore -t -c "SELECT COUNT(*) FROM patients;")
APPOINTMENT_COUNT=$(psql -h localhost -U dental_admin -d dental_pm_test_restore -t -c "SELECT COUNT(*) FROM appointments;")

echo "Test restore results:"
echo "- Patients: $PATIENT_COUNT"
echo "- Appointments: $APPOINTMENT_COUNT"

# 4. Nettoyer
dropdb -h localhost -U dental_admin dental_pm_test_restore

# 5. Log résultat
echo "$(date): Restore test PASSED - Patients: $PATIENT_COUNT, Appointments: $APPOINTMENT_COUNT" >> /var/log/dental-pm/restore_tests.log
```

### 4.3 Checklist Test Trimestriel

- [ ] Restauration DB complète sur serveur staging
- [ ] Vérification données patients (count + sample)
- [ ] Vérification données appointments
- [ ] Vérification fichiers uploads accessibles
- [ ] Test login utilisateur
- [ ] Test création patient
- [ ] Mesure temps de restauration (RTO)
- [ ] Documentation résultats

---

## 5. Objectifs RPO/RTO

| Métrique | Objectif | Actuel |
|----------|----------|--------|
| **RPO** (Recovery Point Objective) | < 6 heures | 6h (incremental) |
| **RTO** (Recovery Time Objective) | < 2 heures | ~45 min (testé) |

---

## 6. Stockage & Sécurité

### 6.1 Chiffrement

- Backups DB: Chiffrés au repos (AES-256) si S3
- Backups locaux: Partition chiffrée LUKS recommandée

### 6.2 Accès

- Backups accessibles uniquement par root et compte backup dédié
- Clés S3 stockées dans vault sécurisé

### 6.3 Vérification Intégrité

```bash
# Vérifier checksum après backup
sha256sum "$BACKUP_FILE" > "$BACKUP_FILE.sha256"

# Vérifier avant restauration
sha256sum -c "$BACKUP_FILE.sha256"
```

---

## 7. Alertes Backup

### 7.1 Monitoring

```bash
# Script vérification backup quotidien
#!/bin/bash
# /usr/local/bin/verify_backup.sh

BACKUP_DIR="/var/backups/dental-pm/db"
TODAY=$(date +%Y%m%d)

# Vérifier existence backup du jour
if ! ls $BACKUP_DIR/*_${TODAY}*.dump.gz 1> /dev/null 2>&1; then
    echo "ALERT: No backup found for $TODAY" | mail -s "CRITICAL: Backup Missing" tech@dental-madagascar.com
    exit 1
fi

# Vérifier taille minimale (> 1MB)
BACKUP_SIZE=$(stat -f%z $(ls -t $BACKUP_DIR/*.dump.gz | head -1) 2>/dev/null || stat -c%s $(ls -t $BACKUP_DIR/*.dump.gz | head -1))
if [ "$BACKUP_SIZE" -lt 1048576 ]; then
    echo "ALERT: Backup suspiciously small ($BACKUP_SIZE bytes)" | mail -s "WARNING: Backup Size" tech@dental-madagascar.com
fi

echo "$(date): Backup verification passed"
```

---

## 8. Conformité RGPD

### 8.1 Données personnelles dans backups

Les backups contiennent des données patients (données de santé sensibles):
- Accès restreint et audité
- Suppression des backups contenant données d'un patient sur demande (droit à l'oubli)
- Conservation max: 10 ans après dernière visite (réglementation médicale Madagascar)

### 8.2 Procédure suppression données

```bash
# Pour supprimer données d'un patient spécifique des backups actifs:
# 1. Identifier patient_id
# 2. Restaurer backup en staging
# 3. DELETE FROM patients WHERE id = 'xxx';
# 4. Recréer backup nettoyé
# 5. Remplacer backup original
# 6. Documenter dans registre RGPD
```
