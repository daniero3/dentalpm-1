const express = require('express');
const { param, body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const PDFDocument = require('pdfkit');
const { Prescription, PrescriptionLog, Patient, User, Clinic } = require('../models');
const { requireClinicId } = require('../middleware/clinic');
const { requireValidSubscription } = require('../middleware/licensing');

const router = express.Router();

// Apply subscription check
router.use(requireValidSubscription);

// Helper: generate prescription number
async function generatePrescriptionNumber(clinicId) {
  const year = new Date().getFullYear();
  const prefix = `ORD-${year}-`;
  
  const lastPrescription = await Prescription.findOne({
    where: {
      clinic_id: clinicId,
      number: { [Op.like]: `${prefix}%` }
    },
    order: [['number', 'DESC']]
  });

  let nextNum = 1;
  if (lastPrescription) {
    const lastNum = parseInt(lastPrescription.number.split('-')[2], 10);
    nextNum = lastNum + 1;
  }

  return `${prefix}${String(nextNum).padStart(4, '0')}`;
}

// Helper: log prescription action
async function logAction(clinicId, prescriptionId, action, userId, meta = {}) {
  await PrescriptionLog.create({
    clinic_id: clinicId,
    prescription_id: prescriptionId,
    action,
    user_id: userId,
    meta_json: meta
  });
}

/**
 * POST /api/patients/:patientId/prescriptions - Create DRAFT
 */
router.post('/patients/:patientId/prescriptions', requireClinicId, [
  param('patientId').isUUID(),
  body('content').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Données invalides', details: errors.array() });
    }

    // Verify patient belongs to clinic
    const patient = await Patient.findOne({
      where: { id: req.params.patientId, clinic_id: req.clinic_id }
    });
    if (!patient) {
      return res.status(404).json({ error: 'Patient non trouvé' });
    }

    const number = await generatePrescriptionNumber(req.clinic_id);
    const content = req.body.content || { items: [], notes: '' };

    const prescription = await Prescription.create({
      clinic_id: req.clinic_id,
      patient_id: req.params.patientId,
      prescriber_id: req.user.id,
      number,
      status: 'DRAFT',
      content_json: content
    });

    await logAction(req.clinic_id, prescription.id, 'CREATE', req.user.id, { number });

    res.status(201).json({
      message: 'Ordonnance créée',
      prescription: {
        id: prescription.id,
        number: prescription.number,
        status: prescription.status,
        content: prescription.content_json,
        created_at: prescription.createdAt
      }
    });
  } catch (error) {
    console.error('Create prescription error:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

/**
 * GET /api/patients/:patientId/prescriptions - List patient prescriptions
 */
router.get('/patients/:patientId/prescriptions', requireClinicId, [
  param('patientId').isUUID()
], async (req, res) => {
  try {
    const patient = await Patient.findOne({
      where: { id: req.params.patientId, clinic_id: req.clinic_id }
    });
    if (!patient) {
      return res.status(404).json({ error: 'Patient non trouvé' });
    }

    const prescriptions = await Prescription.findAll({
      where: {
        patient_id: req.params.patientId,
        clinic_id: req.clinic_id
      },
      include: [
        { model: User, as: 'prescriber', attributes: ['id', 'full_name', 'username'] }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      patient_id: req.params.patientId,
      count: prescriptions.length,
      prescriptions: prescriptions.map(p => ({
        id: p.id,
        number: p.number,
        status: p.status,
        content: p.content_json,
        prescriber: p.prescriber,
        issued_at: p.issued_at,
        created_at: p.createdAt
      }))
    });
  } catch (error) {
    console.error('List prescriptions error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * PUT /api/prescriptions/:id - Update DRAFT only
 */
router.put('/prescriptions/:id', requireClinicId, [
  param('id').isUUID(),
  body('content').isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Données invalides', details: errors.array() });
    }

    const prescription = await Prescription.findOne({
      where: { id: req.params.id, clinic_id: req.clinic_id }
    });

    if (!prescription) {
      return res.status(404).json({ error: 'Ordonnance non trouvée' });
    }

    if (prescription.status !== 'DRAFT') {
      return res.status(409).json({ 
        error: 'PRESCRIPTION_LOCKED',
        message: 'Ordonnance verrouillée, modification interdite'
      });
    }

    await prescription.update({ content_json: req.body.content });
    await logAction(req.clinic_id, prescription.id, 'UPDATE', req.user.id);

    res.json({
      message: 'Ordonnance mise à jour',
      prescription: {
        id: prescription.id,
        number: prescription.number,
        status: prescription.status,
        content: prescription.content_json
      }
    });
  } catch (error) {
    console.error('Update prescription error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/prescriptions/:id/issue - Issue prescription
 */
router.post('/prescriptions/:id/issue', requireClinicId, [
  param('id').isUUID()
], async (req, res) => {
  try {
    const prescription = await Prescription.findOne({
      where: { id: req.params.id, clinic_id: req.clinic_id }
    });

    if (!prescription) {
      return res.status(404).json({ error: 'Ordonnance non trouvée' });
    }

    if (prescription.status !== 'DRAFT') {
      return res.status(409).json({ 
        error: 'INVALID_STATUS',
        message: `Impossible d'émettre une ordonnance en statut ${prescription.status}`
      });
    }

    await prescription.update({
      status: 'ISSUED',
      issued_at: new Date()
    });

    await logAction(req.clinic_id, prescription.id, 'ISSUE', req.user.id);

    res.json({
      message: 'Ordonnance émise',
      prescription: {
        id: prescription.id,
        number: prescription.number,
        status: prescription.status,
        issued_at: prescription.issued_at
      }
    });
  } catch (error) {
    console.error('Issue prescription error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * POST /api/prescriptions/:id/cancel - Cancel prescription
 */
router.post('/prescriptions/:id/cancel', requireClinicId, [
  param('id').isUUID()
], async (req, res) => {
  try {
    const prescription = await Prescription.findOne({
      where: { id: req.params.id, clinic_id: req.clinic_id }
    });

    if (!prescription) {
      return res.status(404).json({ error: 'Ordonnance non trouvée' });
    }

    if (prescription.status === 'CANCELLED') {
      return res.status(409).json({ error: 'Ordonnance déjà annulée' });
    }

    await prescription.update({ status: 'CANCELLED' });
    await logAction(req.clinic_id, prescription.id, 'CANCEL', req.user.id);

    res.json({
      message: 'Ordonnance annulée',
      prescription: {
        id: prescription.id,
        number: prescription.number,
        status: prescription.status
      }
    });
  } catch (error) {
    console.error('Cancel prescription error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * GET /api/prescriptions/:id/pdf - Generate PDF
 */
router.get('/prescriptions/:id/pdf', requireClinicId, [
  param('id').isUUID()
], async (req, res) => {
  try {
    const prescription = await Prescription.findOne({
      where: { id: req.params.id, clinic_id: req.clinic_id },
      include: [
        { model: Patient, as: 'patient' },
        { model: User, as: 'prescriber' },
        { model: Clinic, as: 'clinic' }
      ]
    });

    if (!prescription) {
      return res.status(404).json({ error: 'Ordonnance non trouvée' });
    }

    // Log print action
    await logAction(req.clinic_id, prescription.id, 'PRINT', req.user.id);

    // Generate PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${prescription.number}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    });

    const clinic = prescription.clinic;
    const patient = prescription.patient;
    const prescriber = prescription.prescriber;
    const content = prescription.content_json;

    // Header
    doc.fontSize(18).font('Helvetica-Bold').text(clinic?.name || 'Cabinet Dentaire', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(clinic?.address || '', { align: 'center' });
    doc.moveDown(0.5);
    doc.text(`Tél: ${clinic?.phone || ''} | Email: ${clinic?.email || ''}`, { align: 'center' });
    
    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    // Title
    doc.fontSize(16).font('Helvetica-Bold').text('ORDONNANCE MÉDICALE', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text(`N° ${prescription.number}`, { align: 'center' });
    doc.moveDown(1);

    // Patient info
    doc.fontSize(11).font('Helvetica-Bold').text('Patient:');
    doc.font('Helvetica').text(`${patient.first_name} ${patient.last_name}`);
    if (patient.date_of_birth) {
      const dob = new Date(patient.date_of_birth).toLocaleDateString('fr-FR');
      doc.text(`Né(e) le: ${dob}`);
    }
    doc.moveDown(1);

    // Date
    const issueDate = prescription.issued_at 
      ? new Date(prescription.issued_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.text(`Date: ${issueDate}`);
    doc.moveDown(1);

    // Prescription content
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    if (content.items && content.items.length > 0) {
      content.items.forEach((item, index) => {
        doc.font('Helvetica-Bold').text(`${index + 1}. ${item.medication || item.name || 'Médicament'}`);
        if (item.dosage) doc.font('Helvetica').text(`   Dosage: ${item.dosage}`);
        if (item.posology) doc.font('Helvetica').text(`   Posologie: ${item.posology}`);
        if (item.duration) doc.font('Helvetica').text(`   Durée: ${item.duration}`);
        if (item.notes) doc.font('Helvetica-Oblique').text(`   Note: ${item.notes}`);
        doc.moveDown(0.5);
      });
    } else {
      doc.font('Helvetica').text('Aucune prescription');
    }

    doc.moveDown(1);

    // General notes
    if (content.notes) {
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').text('Notes:');
      doc.font('Helvetica').text(content.notes);
      doc.moveDown(1);
    }

    // Signature
    doc.moveDown(2);
    doc.font('Helvetica').text('Signature du prescripteur:', { align: 'right' });
    doc.moveDown(2);
    doc.font('Helvetica-Bold').text(`Dr. ${prescriber?.full_name || prescriber?.username || 'Prescripteur'}`, { align: 'right' });

    // Footer
    doc.moveDown(2);
    doc.fontSize(8).font('Helvetica').fillColor('gray');
    doc.text(`Document généré le ${new Date().toLocaleDateString('fr-FR')} - ${prescription.number}`, { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('PDF prescription error:', error);
    res.status(500).json({ error: 'Erreur génération PDF', details: error.message });
  }
});

module.exports = router;
