const express = require('express');
const { param, body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const PDFDocument = require('pdfkit');
const { Prescription, Patient, User, Clinic } = require('../models');
// ✅ Subscription verifiee cote frontend (LicensingGuard)

// ── Helper: numéro ordonnance ─────────────────────────────────────────────
async function generatePrescriptionNumber(clinicId) {
  const year = new Date().getFullYear();
  const prefix = `ORD-${year}-`;
  try {
    const lastPrescription = await Prescription.findOne({
      where: {
        clinic_id: clinicId,
        number: { [Op.iLike]: `${prefix}%` }
      },
      order: [['created_at', 'DESC']]
    });
    let nextNum = 1;
    if (lastPrescription) {
      const parts = lastPrescription.number.split('-');
      const lastNum = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }
    return `${prefix}${String(nextNum).padStart(4, '0')}`;
  } catch (err) {
    // Fallback si erreur
    return `${prefix}${Date.now().toString().slice(-4)}`;
  }
}

// ── Helper: log action (optionnel) ────────────────────────────────────────
async function logAction(clinicId, prescriptionId, action, userId, meta = {}) {
  try {
    const { PrescriptionLog } = require('../models');
    await PrescriptionLog.create({
      clinic_id: clinicId,
      prescription_id: prescriptionId,
      action,
      user_id: userId,
      meta_json: meta
    });
  } catch (err) {
    // Non-fatal si PrescriptionLog n'existe pas
    console.warn('PrescriptionLog error (non-fatal):', err.message);
  }
}

/**
 * POST /api/patients/:patientId/prescriptions
 */
router.post('/patients/:patientId/prescriptions', requireClinicId, [
  param('patientId').isUUID(),
  body('content').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Données invalides', details: errors.array() });

    const patient = await Patient.findOne({
      where: { id: req.params.patientId, clinic_id: clinicId }
    });
    if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });

    const number  = await generatePrescriptionNumber(req.clinic_id);
    const content = req.body.content || { items: [], notes: '' };

    const prescription = await Prescription.create({
      clinic_id:     req.clinic_id,
      patient_id:    req.params.patientId,
      prescriber_id: req.user.id,
      number,
      status:        'DRAFT',
      content_json:  content
    });

    await logAction(req.clinic_id, prescription.id, 'CREATE', req.user.id, { number });

    res.status(201).json({
      message: 'Ordonnance créée',
      prescription: {
        id:         prescription.id,
        number:     prescription.number,
        status:     prescription.status,
        content:    prescription.content_json,
        created_at: prescription.createdAt
      }
    });
  } catch (error) {
    console.error('Create prescription error:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

/**
 * GET /api/patients/:patientId/prescriptions
 */
router.get('/patients/:patientId/prescriptions', requireClinicId, [
  param('patientId').isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'ID invalide' });

    const patient = await Patient.findOne({
      where: { id: req.params.patientId, clinic_id: clinicId }
    });
    if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });

    const prescriptions = await Prescription.findAll({
      where: { patient_id: req.params.patientId, clinic_id: clinicId },
      include: [
        { model: User, as: 'prescriber', attributes: ['id', 'full_name', 'username'], required: false }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      patient_id: req.params.patientId,
      count: prescriptions.length,
      prescriptions: prescriptions.map(p => ({
        id:         p.id,
        number:     p.number,
        status:     p.status,
        content:    p.content_json,
        prescriber: p.prescriber,
        issued_at:  p.issued_at,
        created_at: p.createdAt
      }))
    });
  } catch (error) {
    console.error('List prescriptions error:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

/**
 * PUT /api/prescriptions/:id
 */
router.put('/prescriptions/:id', requireClinicId, [
  param('id').isUUID(),
  body('content').isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Données invalides' });

    const prescription = await Prescription.findOne({
      where: { id: req.params.id, clinic_id: clinicId }
    });
    if (!prescription) return res.status(404).json({ error: 'Ordonnance non trouvée' });
    if (prescription.status !== 'DRAFT') return res.status(409).json({ error: 'PRESCRIPTION_LOCKED', message: 'Ordonnance verrouillée' });

    await prescription.update({ content_json: req.body.content });
    await logAction(req.clinic_id, prescription.id, 'UPDATE', req.user.id);

    res.json({ message: 'Ordonnance mise à jour', prescription: { id: prescription.id, number: prescription.number, status: prescription.status, content: prescription.content_json } });
  } catch (error) {
    console.error('Update prescription error:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

/**
 * POST /api/prescriptions/:id/issue
 */
router.post('/prescriptions/:id/issue', requireClinicId, [param('id').isUUID()], async (req, res) => {
  try {
    const prescription = await Prescription.findOne({ where: { id: req.params.id, clinic_id: clinicId } });
    if (!prescription) return res.status(404).json({ error: 'Ordonnance non trouvée' });
    if (prescription.status !== 'DRAFT') return res.status(409).json({ error: 'INVALID_STATUS' });

    await prescription.update({ status: 'ISSUED', issued_at: new Date() });
    await logAction(req.clinic_id, prescription.id, 'ISSUE', req.user.id);

    res.json({ message: 'Ordonnance émise', prescription: { id: prescription.id, number: prescription.number, status: prescription.status, issued_at: prescription.issued_at } });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

/**
 * POST /api/prescriptions/:id/cancel
 */
router.post('/prescriptions/:id/cancel', requireClinicId, [param('id').isUUID()], async (req, res) => {
  try {
    const prescription = await Prescription.findOne({ where: { id: req.params.id, clinic_id: clinicId } });
    if (!prescription) return res.status(404).json({ error: 'Ordonnance non trouvée' });
    if (prescription.status === 'CANCELLED') return res.status(409).json({ error: 'Déjà annulée' });

    await prescription.update({ status: 'CANCELLED' });
    await logAction(req.clinic_id, prescription.id, 'CANCEL', req.user.id);

    res.json({ message: 'Ordonnance annulée', prescription: { id: prescription.id, number: prescription.number, status: prescription.status } });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

/**
 * GET /api/prescriptions/:id/pdf
 */
router.get('/prescriptions/:id/pdf', requireClinicId, [param('id').isUUID()], async (req, res) => {
  try {
    const prescription = await Prescription.findOne({
      where: { id: req.params.id, clinic_id: clinicId },
      include: [
        { model: Patient, as: 'patient', required: false },
        { model: User,    as: 'prescriber', required: false },
        { model: Clinic,  as: 'clinic', required: false }
      ]
    });
    if (!prescription) return res.status(404).json({ error: 'Ordonnance non trouvée' });

    await logAction(req.clinic_id, prescription.id, 'PRINT', req.user.id);

    const doc    = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {
      const pdf = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${prescription.number}.pdf"`);
      res.setHeader('Content-Length', pdf.length);
      res.send(pdf);
    });

    const clinic     = prescription.clinic;
    const patient    = prescription.patient;
    const prescriber = prescription.prescriber;
    const content    = prescription.content_json || { items: [], notes: '' };

    // Header
    doc.fontSize(18).font('Helvetica-Bold').text(clinic?.name || 'Cabinet Dentaire', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(clinic?.address || '', { align: 'center' });
    doc.moveDown(0.5);
    if (clinic?.phone || clinic?.email) doc.text(`Tél: ${clinic?.phone || ''} | Email: ${clinic?.email || ''}`, { align: 'center' });
    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    doc.fontSize(16).font('Helvetica-Bold').text('ORDONNANCE MÉDICALE', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text(`N° ${prescription.number}`, { align: 'center' });
    doc.moveDown(1);

    if (patient) {
      doc.fontSize(11).font('Helvetica-Bold').text('Patient:');
      doc.font('Helvetica').text(`${patient.first_name} ${patient.last_name}`);
      if (patient.date_of_birth) doc.text(`Né(e) le: ${new Date(patient.date_of_birth).toLocaleDateString('fr-FR')}`);
      doc.moveDown(1);
    }

    const issueDate = prescription.issued_at
      ? new Date(prescription.issued_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.text(`Date: ${issueDate}`);
    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    if (content.items?.length > 0) {
      content.items.forEach((item, i) => {
        doc.font('Helvetica-Bold').text(`${i + 1}. ${item.medication || item.name || 'Médicament'}`);
        if (item.dosage)   doc.font('Helvetica').text(`   Dosage: ${item.dosage}`);
        if (item.posology) doc.font('Helvetica').text(`   Posologie: ${item.posology}`);
        if (item.duration) doc.font('Helvetica').text(`   Durée: ${item.duration}`);
        doc.moveDown(0.5);
      });
    } else {
      doc.font('Helvetica').text('Aucune prescription');
    }

    if (content.notes) {
      doc.moveDown(1);
      doc.font('Helvetica-Bold').text('Notes:');
      doc.font('Helvetica').text(content.notes);
    }

    doc.moveDown(3);
    doc.font('Helvetica').text('Signature:', { align: 'right' });
    doc.moveDown(2);
    doc.font('Helvetica-Bold').text(`Dr. ${prescriber?.full_name || prescriber?.username || 'Prescripteur'}`, { align: 'right' });
    doc.moveDown(2);
    doc.fontSize(8).font('Helvetica').fillColor('gray').text(`Généré le ${new Date().toLocaleDateString('fr-FR')} - ${prescription.number}`, { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('PDF error:', error);
    res.status(500).json({ error: 'Erreur PDF', details: error.message });
  }
});

module.exports = router;
