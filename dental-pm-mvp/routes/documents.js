const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { param, body, validationResult } = require('express-validator');
const { Document, Patient, User, AuditLog } = require('../models');
const { requireClinicId } = require('../middleware/clinic');

const router = express.Router();

// Constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIMETYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf'];
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'documents');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeOk = ALLOWED_MIMETYPES.includes(file.mimetype);
  const extOk = ALLOWED_EXTENSIONS.includes(ext);
  
  if (mimeOk && extOk) {
    cb(null, true);
  } else {
    cb(new Error(`Type de fichier non autorisé. Formats acceptés: JPG, PNG, PDF`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE }
});

// Error handler for multer
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Fichier trop volumineux. Maximum: 5MB' });
    }
    return res.status(400).json({ error: `Erreur upload: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};

/**
 * @route POST /api/documents/upload
 * @desc Upload a document for a patient
 */
router.post('/upload', requireClinicId, upload.single('file'), handleUploadError, [
  body('patient_id').isUUID().withMessage('ID patient invalide'),
  body('category').isIn(['RADIO', 'PHOTO', 'ANALYSE', 'FAISABILITE', 'ORDONNANCE', 'AUTRE']).withMessage('Catégorie invalide'),
  body('description').optional().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Clean up uploaded file if validation fails
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: 'Données invalides', details: errors.array() });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    const { patient_id, category, description } = req.body;

    // Verify patient belongs to clinic
    const patient = await Patient.findOne({
      where: { id: patient_id, clinic_id: req.clinic_id }
    });

    if (!patient) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Patient non trouvé' });
    }

    // Create document record
    const document = await Document.create({
      clinic_id: req.clinic_id,
      patient_id,
      uploaded_by_user_id: req.user.id,
      category,
      original_filename: req.file.originalname,
      stored_filename: req.file.filename,
      mime_type: req.file.mimetype,
      file_size: req.file.size,
      description: description || null
    });

    // Audit log
    await AuditLog.create({
      user_id: req.user.id,
      action: 'CREATE',
      resource_type: 'documents',
      resource_id: document.id,
      new_values: { patient_id, category, filename: req.file.originalname },
      ip_address: req.ip,
      description: `Document uploadé: ${req.file.originalname} (${category})`
    });

    res.status(201).json({
      message: 'Document uploadé avec succès',
      document: {
        id: document.id,
        category: document.category,
        original_filename: document.original_filename,
        mime_type: document.mime_type,
        file_size: document.file_size,
        description: document.description,
        created_at: document.createdAt
      }
    });
  } catch (error) {
    console.error('Upload document error:', error);
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

/**
 * @route GET /api/documents/patient/:patientId
 * @desc List all documents for a patient
 */
router.get('/patient/:patientId', requireClinicId, [
  param('patientId').isUUID()
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

    const documents = await Document.findAll({
      where: {
        patient_id: req.params.patientId,
        clinic_id: req.clinic_id,
        is_deleted: false
      },
      attributes: ['id', 'category', 'original_filename', 'mime_type', 'file_size', 'description', 'created_at'],
      include: [
        { model: User, as: 'uploadedBy', attributes: ['id', 'full_name', 'username'] }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      patient_id: req.params.patientId,
      count: documents.length,
      documents
    });
  } catch (error) {
    console.error('List documents error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route GET /api/documents/:id/download
 * @desc Download a document
 */
router.get('/:id/download', requireClinicId, [
  param('id').isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Données invalides', details: errors.array() });
    }

    const document = await Document.findOne({
      where: {
        id: req.params.id,
        clinic_id: req.clinic_id,
        is_deleted: false
      }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document non trouvé' });
    }

    const filePath = path.join(UPLOAD_DIR, document.stored_filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Fichier introuvable sur le serveur' });
    }

    res.setHeader('Content-Type', document.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${document.original_filename}"`);
    res.setHeader('Content-Length', document.file_size);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route GET /api/documents/:id/view
 * @desc View/preview a document (inline)
 */
router.get('/:id/view', requireClinicId, [
  param('id').isUUID()
], async (req, res) => {
  try {
    const document = await Document.findOne({
      where: {
        id: req.params.id,
        clinic_id: req.clinic_id,
        is_deleted: false
      }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document non trouvé' });
    }

    const filePath = path.join(UPLOAD_DIR, document.stored_filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Fichier introuvable sur le serveur' });
    }

    res.setHeader('Content-Type', document.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${document.original_filename}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('View document error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route DELETE /api/documents/:id
 * @desc Soft delete a document
 */
router.delete('/:id', requireClinicId, [
  param('id').isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Données invalides', details: errors.array() });
    }

    const document = await Document.findOne({
      where: {
        id: req.params.id,
        clinic_id: req.clinic_id,
        is_deleted: false
      }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document non trouvé' });
    }

    await document.update({
      is_deleted: true,
      deleted_at: new Date(),
      deleted_by_user_id: req.user.id
    });

    // Audit log
    await AuditLog.create({
      user_id: req.user.id,
      action: 'DELETE',
      resource_type: 'documents',
      resource_id: document.id,
      old_values: { filename: document.original_filename },
      ip_address: req.ip,
      description: `Document supprimé: ${document.original_filename}`
    });

    res.json({ message: 'Document supprimé', document_id: document.id });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * @route PATCH /api/documents/:id/restore
 * @desc Restore a soft-deleted document
 */
router.patch('/:id/restore', requireClinicId, [
  param('id').isUUID()
], async (req, res) => {
  try {
    const document = await Document.findOne({
      where: {
        id: req.params.id,
        clinic_id: req.clinic_id,
        is_deleted: true
      }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document non trouvé ou non supprimé' });
    }

    await document.update({
      is_deleted: false,
      deleted_at: null,
      deleted_by_user_id: null
    });

    res.json({ message: 'Document restauré', document_id: document.id });
  } catch (error) {
    console.error('Restore document error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
