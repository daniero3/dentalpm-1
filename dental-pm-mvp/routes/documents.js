const express = require('express');
const multer  = require('multer');
const { param, body, validationResult } = require('express-validator');
const { Document, Patient, User, AuditLog } = require('../models');
const { requireClinicId } = require('../middleware/clinic');
const { requireValidSubscription } = require('../middleware/licensing');

const router = express.Router();
router.use(requireValidSubscription);

// ── Constantes ──────────────────────────────────────────────────────────────
const MAX_FILE_SIZE   = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIMES   = ['image/jpeg', 'image/png', 'application/pdf'];
const VALID_CATEGORIES = ['RADIO', 'PHOTO', 'ANALYSE', 'FAISABILITE', 'ORDONNANCE', 'AUTRE'];

// ── Multer — stockage en mémoire (pas sur disque) ────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type non autorisé. Formats: JPG, PNG, PDF'), false);
    }
  }
});

const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Fichier trop volumineux. Max: 5MB' });
    return res.status(400).json({ error: `Erreur upload: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};

// ── Migrer la table si nécessaire ────────────────────────────────────────────
async function ensureFileDataColumn() {
  try {
    const sequelize = require('../database/connection');
    await sequelize.query(`
      ALTER TABLE documents
        ADD COLUMN IF NOT EXISTS file_data TEXT,
        ALTER COLUMN stored_filename DROP NOT NULL,
        ALTER COLUMN clinic_id DROP NOT NULL,
        ALTER COLUMN uploaded_by_user_id DROP NOT NULL;
    `);
  } catch (err) {
    console.error('Migration documents (non-fatal):', err.message);
  }
}
ensureFileDataColumn();

// ── POST /api/documents/upload ───────────────────────────────────────────────
router.post('/upload', requireClinicId,
  upload.single('file'), handleUploadError,
  [
    body('patient_id').isUUID().withMessage('ID patient invalide'),
    body('category').isIn(VALID_CATEGORIES).withMessage('Catégorie invalide'),
    body('description').optional().isLength({ max: 500 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Données invalides', details: errors.array() });
      }
      if (!req.file) {
        return res.status(400).json({ error: 'Aucun fichier fourni' });
      }

      const { patient_id, category, description } = req.body;

      // Vérifier patient
      const patient = await Patient.findOne({
        where: { id: patient_id, clinic_id: req.clinic_id }
      });
      if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });

      // ✅ Stocker le fichier en base64 dans PostgreSQL
      const fileBase64 = req.file.buffer.toString('base64');

      const document = await Document.create({
        clinic_id:            req.clinic_id,
        patient_id,
        uploaded_by_user_id:  req.user?.id || null,
        category,
        original_filename:    req.file.originalname,
        stored_filename:      null, // plus utilisé
        mime_type:            req.file.mimetype,
        file_size:            req.file.size,
        file_data:            fileBase64, // ✅ stocké en base64
        description:          description || null
      });

      // Audit log
      try {
        await AuditLog.create({
          user_id:       req.user?.id,
          action:        'CREATE',
          resource_type: 'documents',
          resource_id:   document.id,
          new_values:    { patient_id, category, filename: req.file.originalname },
          ip_address:    req.ip,
          description:   `Document uploadé: ${req.file.originalname} (${category})`
        });
      } catch (auditErr) { console.error('Audit log error:', auditErr); }

      res.status(201).json({
        message: 'Document uploadé avec succès',
        document: {
          id:                document.id,
          category:          document.category,
          original_filename: document.original_filename,
          mime_type:         document.mime_type,
          file_size:         document.file_size,
          description:       document.description,
          created_at:        document.createdAt
        }
      });
    } catch (error) {
      console.error('Upload document error:', error);
      res.status(500).json({ error: 'Erreur serveur', details: error.message });
    }
  }
);

// ── GET /api/documents/patient/:patientId ────────────────────────────────────
router.get('/patient/:patientId', requireClinicId, [
  param('patientId').isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Données invalides' });

    const patient = await Patient.findOne({
      where: { id: req.params.patientId, clinic_id: req.clinic_id }
    });
    if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });

    const documents = await Document.findAll({
      where: { patient_id: req.params.patientId, clinic_id: req.clinic_id, is_deleted: false },
      attributes: ['id', 'category', 'original_filename', 'mime_type', 'file_size', 'description', 'created_at'],
      order: [['created_at', 'DESC']]
    });

    res.json({ patient_id: req.params.patientId, count: documents.length, documents });
  } catch (error) {
    console.error('List documents error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── GET /api/documents/:id/download ─────────────────────────────────────────
router.get('/:id/download', requireClinicId, [
  param('id').isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Données invalides' });

    const document = await Document.findOne({
      where: { id: req.params.id, clinic_id: req.clinic_id, is_deleted: false }
    });
    if (!document) return res.status(404).json({ error: 'Document non trouvé' });
    if (!document.file_data) return res.status(404).json({ error: 'Fichier introuvable' });

    const buffer = Buffer.from(document.file_data, 'base64');
    res.setHeader('Content-Type', document.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${document.original_filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── GET /api/documents/:id/view ──────────────────────────────────────────────
router.get('/:id/view', requireClinicId, [
  param('id').isUUID()
], async (req, res) => {
  try {
    const document = await Document.findOne({
      where: { id: req.params.id, clinic_id: req.clinic_id, is_deleted: false }
    });
    if (!document) return res.status(404).json({ error: 'Document non trouvé' });
    if (!document.file_data) return res.status(404).json({ error: 'Fichier introuvable' });

    const buffer = Buffer.from(document.file_data, 'base64');
    res.setHeader('Content-Type', document.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${document.original_filename}"`);
    res.send(buffer);
  } catch (error) {
    console.error('View error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── DELETE /api/documents/:id ────────────────────────────────────────────────
router.delete('/:id', requireClinicId, [
  param('id').isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Données invalides' });

    const document = await Document.findOne({
      where: { id: req.params.id, clinic_id: req.clinic_id, is_deleted: false }
    });
    if (!document) return res.status(404).json({ error: 'Document non trouvé' });

    await document.update({
      is_deleted:           true,
      deleted_at:           new Date(),
      deleted_by_user_id:   req.user?.id || null,
      file_data:            null // ✅ libérer l'espace
    });

    try {
      await AuditLog.create({
        user_id: req.user?.id, action: 'DELETE', resource_type: 'documents',
        resource_id: document.id, ip_address: req.ip,
        description: `Document supprimé: ${document.original_filename}`
      });
    } catch (auditErr) { console.error('Audit log error:', auditErr); }

    res.json({ message: 'Document supprimé', document_id: document.id });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
