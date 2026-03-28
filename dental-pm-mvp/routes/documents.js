const express = require('express');
const multer  = require('multer');
const { param, body, validationResult } = require('express-validator');
const { Document, Patient, User, AuditLog } = require('../models');

const router = express.Router();

const getClinicId = (req) => req.clinic_id || req.user?.clinic_id || req.user?.dataValues?.clinic_id || null;
const getUserId   = (req) => req.user?.id   || req.user?.dataValues?.id || req.user?.userId || null;

const MAX_FILE_SIZE    = 5 * 1024 * 1024;
const ALLOWED_MIMES    = ['image/jpeg','image/png','application/pdf'];
const VALID_CATEGORIES = ['RADIO','PHOTO','ANALYSE','FAISABILITE','ORDONNANCE','AUTRE'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Type de fichier non autorisé'), false);
  }
});

// ── GET /api/documents/patient/:patientId ─────────────────────────────────────
router.get('/patient/:patientId', [param('patientId').isUUID()], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error:'Données invalides', details: errors.array() });

    const clinicId = getClinicId(req);
    const where    = { patient_id: req.params.patientId };
    if (clinicId) where.clinic_id = clinicId;

    const documents = await Document.findAll({
      where,
      include: [{ model: User, as: 'uploadedBy', attributes: ['id','full_name','username'], required: false }],
      order: [['createdAt','DESC']]
    });

    return res.json({ documents, count: documents.length });
  } catch (error) {
    console.error('Get documents error:', error);
    return res.status(500).json({ error:'Erreur serveur', details: error.message });
  }
});

// ── POST /api/documents/patient/:patientId ────────────────────────────────────
router.post('/patient/:patientId', upload.single('file'), [
  param('patientId').isUUID(),
  body('category').optional().isIn(VALID_CATEGORIES),
  body('title').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error:'Données invalides', details: errors.array() });

    if (!req.file) return res.status(400).json({ error:'Fichier requis' });

    const clinicId = getClinicId(req);
    const userId   = getUserId(req);

    const fileBase64   = req.file.buffer.toString('base64');
    const fileDataUrl  = `data:${req.file.mimetype};base64,${fileBase64}`;

    const document = await Document.create({
      patient_id:       req.params.patientId,
      clinic_id:        clinicId,
      uploaded_by:      userId,
      title:            req.body.title || req.file.originalname,
      category:         req.body.category || 'AUTRE',
      original_filename: req.file.originalname,
      mime_type:        req.file.mimetype,
      file_size:        req.file.size,
      file_data:        fileDataUrl
    });

    try {
      await AuditLog.create({ user_id: userId, action:'CREATE', resource_type:'documents', resource_id: document.id, ip_address: req.ip, description:`Document uploadé: ${req.file.originalname}` });
    } catch (e) { console.warn('AuditLog (non-fatal):', e.message); }

    return res.status(201).json({ message:'Document enregistré', document: { id: document.id, title: document.title, category: document.category, mime_type: document.mime_type, file_size: document.file_size, createdAt: document.createdAt } });
  } catch (error) {
    console.error('Upload document error:', error);
    return res.status(500).json({ error:'Erreur serveur', details: error.message });
  }
});

// ── GET /api/documents/:id/view ───────────────────────────────────────────────
router.get('/:id/view', [param('id').isUUID()], async (req, res) => {
  try {
    const clinicId = getClinicId(req);
    const where    = { id: req.params.id };
    if (clinicId) where.clinic_id = clinicId;

    const document = await Document.findOne({ where });
    if (!document) return res.status(404).json({ error:'Document non trouvé' });

    if (document.file_data && document.file_data.startsWith('data:')) {
      const [header, data] = document.file_data.split(',');
      const mimeType = header.split(':')[1].split(';')[0];
      const buffer   = Buffer.from(data, 'base64');
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${document.original_filename || 'document'}"`);
      return res.send(buffer);
    }

    return res.status(404).json({ error:'Données du fichier non trouvées' });
  } catch (error) {
    return res.status(500).json({ error:'Erreur serveur', details: error.message });
  }
});

// ── DELETE /api/documents/:id ─────────────────────────────────────────────────
router.delete('/:id', [param('id').isUUID()], async (req, res) => {
  try {
    const clinicId = getClinicId(req);
    const where    = { id: req.params.id };
    if (clinicId) where.clinic_id = clinicId;

    const document = await Document.findOne({ where });
    if (!document) return res.status(404).json({ error:'Document non trouvé' });

    await document.destroy();
    return res.json({ message:'Document supprimé' });
  } catch (error) {
    return res.status(500).json({ error:'Erreur serveur', details: error.message });
  }
});

module.exports = router;
