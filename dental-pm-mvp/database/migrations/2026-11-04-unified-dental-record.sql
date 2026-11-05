-- Migration additive et réversible par sauvegarde : aucune suppression de données.
-- À exécuter UNE SEULE FOIS sur PostgreSQL après sauvegarde et avant publication du module.
-- Le schéma historique est conservé pour ne pas perdre les anciennes procédures.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE IF NOT EXISTS dental_charts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  teeth_records JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (patient_id, clinic_id)
);
-- Note : une table dental_charts déjà présente n'est jamais écrasée.
-- Pour une installation ancienne sans contrainte (patient_id, clinic_id),
-- vérifier les doublons AVANT d'ajouter cette contrainte en production.
