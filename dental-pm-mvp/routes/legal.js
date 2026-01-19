const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const LEGAL_DIR = path.join(__dirname, '../legal');

/**
 * @route GET /api/legal/cgu
 * @desc Get Terms of Service (CGU)
 * @access Public
 */
router.get('/cgu', (req, res) => {
  try {
    const content = fs.readFileSync(path.join(LEGAL_DIR, 'CGU.md'), 'utf8');
    res.json({
      title: 'Conditions Générales d\'Utilisation',
      content,
      lastUpdated: '2026-01-19'
    });
  } catch (error) {
    res.status(500).json({ error: 'Document non disponible' });
  }
});

/**
 * @route GET /api/legal/privacy
 * @desc Get Privacy Policy
 * @access Public
 */
router.get('/privacy', (req, res) => {
  try {
    const content = fs.readFileSync(path.join(LEGAL_DIR, 'PRIVACY_POLICY.md'), 'utf8');
    res.json({
      title: 'Politique de Confidentialité',
      content,
      lastUpdated: '2026-01-19'
    });
  } catch (error) {
    res.status(500).json({ error: 'Document non disponible' });
  }
});

/**
 * @route GET /api/legal/mentions
 * @desc Get Legal Mentions
 * @access Public
 */
router.get('/mentions', (req, res) => {
  try {
    const content = fs.readFileSync(path.join(LEGAL_DIR, 'MENTIONS_LEGALES.md'), 'utf8');
    res.json({
      title: 'Mentions Légales',
      content,
      lastUpdated: '2026-01-19'
    });
  } catch (error) {
    res.status(500).json({ error: 'Document non disponible' });
  }
});

/**
 * @route GET /api/legal/consent-template
 * @desc Get Patient Consent Template
 * @access Authenticated
 */
router.get('/consent-template', (req, res) => {
  try {
    const content = fs.readFileSync(path.join(LEGAL_DIR, 'PATIENT_CONSENT_TEMPLATE.md'), 'utf8');
    res.json({
      title: 'Formulaire de Consentement Patient',
      content,
      lastUpdated: '2026-01-19'
    });
  } catch (error) {
    res.status(500).json({ error: 'Document non disponible' });
  }
});

/**
 * @route GET /api/legal/consent-pdf/:patientId
 * @desc Generate Patient Consent PDF
 * @access Authenticated
 */
router.get('/consent-pdf/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { Patient } = require('../models');
    
    // Get patient data
    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient non trouvé' });
    }

    // Generate HTML for PDF
    const template = fs.readFileSync(path.join(LEGAL_DIR, 'PATIENT_CONSENT_TEMPLATE.md'), 'utf8');
    
    // Replace placeholders
    const today = new Date().toLocaleDateString('fr-FR');
    const consentRef = `CONSENT-${patient.clinic_id?.substring(0, 8) || 'CLINIC'}-${patient.patient_number}-${today.replace(/\//g, '')}`;
    
    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.6; }
    h1 { color: #1a365d; border-bottom: 2px solid #1a365d; padding-bottom: 10px; }
    h2 { color: #2c5282; margin-top: 30px; }
    h3 { color: #4a5568; }
    .checkbox { display: inline-block; width: 16px; height: 16px; border: 1px solid #333; margin-right: 8px; vertical-align: middle; }
    .field { border-bottom: 1px solid #333; min-width: 200px; display: inline-block; margin: 0 10px; }
    .signature-area { margin-top: 40px; display: flex; justify-content: space-between; }
    .signature-box { width: 45%; }
    .signature-line { border-bottom: 1px solid #333; height: 60px; margin-bottom: 5px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc; font-size: 12px; color: #666; }
    .patient-info { background: #f7fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
  </style>
</head>
<body>
  <h1>FORMULAIRE DE CONSENTEMENT PATIENT</h1>
  <p><strong>Cabinet Dentaire - Madagascar</strong></p>
  
  <div class="patient-info">
    <h3>INFORMATIONS PATIENT</h3>
    <p><strong>Nom :</strong> ${patient.last_name || '____________________'}</p>
    <p><strong>Prénom :</strong> ${patient.first_name || '____________________'}</p>
    <p><strong>Date de naissance :</strong> ${patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString('fr-FR') : '____ / ____ / ________'}</p>
    <p><strong>N° Patient :</strong> ${patient.patient_number || '____________________'}</p>
  </div>
  
  <h2>1. CONSENTEMENT AUX SOINS</h2>
  <p>Je soussigné(e), patient(e) ou représentant légal du patient mineur, déclare :</p>
  <p><span class="checkbox"></span> Avoir été informé(e) de mon état de santé bucco-dentaire</p>
  <p><span class="checkbox"></span> Avoir reçu des explications claires sur les traitements proposés</p>
  <p><span class="checkbox"></span> Avoir été informé(e) des risques et alternatives possibles</p>
  <p><span class="checkbox"></span> Avoir pu poser toutes mes questions et obtenu des réponses satisfaisantes</p>
  <p><strong>Je consens librement aux soins dentaires proposés par le praticien.</strong></p>
  
  <h2>2. CONSENTEMENT AU TRAITEMENT DES DONNÉES</h2>
  <p>Conformément à la loi n°2014-038 sur la protection des données personnelles :</p>
  <p><span class="checkbox"></span> <strong>Obligatoire</strong> - Gestion de mon dossier médical et suivi des soins</p>
  <p><span class="checkbox"></span> <strong>Obligatoire</strong> - Facturation et gestion administrative</p>
  <p><span class="checkbox"></span> <strong>Optionnel</strong> - Rappels de rendez-vous par SMS</p>
  <p><span class="checkbox"></span> <strong>Optionnel</strong> - Rappels de rendez-vous par email</p>
  
  <h2>3. DROITS DU PATIENT</h2>
  <p>Droits d'accès, rectification, effacement et opposition.</p>
  <p><strong>Contact :</strong> privacy@dental-madagascar.com</p>
  
  <h2>4. CONSERVATION</h2>
  <p>Données conservées <strong>10 ans</strong> après dernière consultation.</p>
  
  <h2>5. SIGNATURE</h2>
  <p><span class="checkbox"></span> Je confirme avoir lu et compris ce formulaire de consentement.</p>
  <p><strong>Date :</strong> ${today}</p>
  
  <div class="signature-area">
    <div class="signature-box">
      <div class="signature-line"></div>
      <p>Signature du patient</p>
    </div>
    <div class="signature-box">
      <div class="signature-line"></div>
      <p>Signature du praticien</p>
    </div>
  </div>
  
  <div class="footer">
    <p><strong>Référence :</strong> ${consentRef}</p>
    <p><em>Document à conserver dans le dossier patient - Copie remise au patient sur demande</em></p>
  </div>
</body>
</html>`;

    // Return HTML (PDF generation would require puppeteer or similar)
    // For now, return printable HTML
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="consent_${patient.patient_number}.html"`);
    res.send(html);
    
  } catch (error) {
    console.error('Consent PDF error:', error);
    res.status(500).json({ error: 'Erreur lors de la génération du document' });
  }
});

module.exports = router;
