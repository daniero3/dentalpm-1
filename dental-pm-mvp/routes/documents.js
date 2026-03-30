const express = require('express');
const multer  = require('multer');
const { param } = require('express-validator');
const { Document } = require('../models');

const router = express.Router();

const getClinicId = (req) => req.clinic_id || req.user?.clinic_id || req.user?.dataValues?.clinic_id || null;
const getUserId   = (req) => req.user?.id   || req.user?.dataValues?.id || null;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, true)
});

const serveFile = (doc, res, disp) => {
  if (doc.file_data?.startsWith('data:')) {
    const [hdr, b64] = doc.file_data.split(',');
    const mime       = hdr.split(':')[1].split(';')[0];
    const buf        = Buffer.from(b64, 'base64');
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `${disp}; filename="${doc.original_filename || 'document'}"`);
    return res.send(buf);
  }
  return res.status(404).json({ error: 'Fichier non disponible' });
};

// GET /api/documents/patient/:patientId
router.get('/patient/:patientId', async (req, res) => {
  try {
    const clinicId = getClinicId(req);
    const where    = { patient_id: req.params.patientId };
    if (clinicId) where.clinic_id = clinicId;
    const documents = await Document.findAll({ where, order: [['createdAt','DESC']] });
    res.json({ documents, count: documents.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/documents/upload
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const patientId = req.body.patient_id || req.query.patient_id;
    if (!patientId) return res.status(400).json({ error: 'patient_id requis' });
    if (!req.file)  return res.status(400).json({ error: 'Fichier requis' });
    const clinicId = getClinicId(req);
    const doc = await Document.create({
      patient_id: patientId, clinic_id: clinicId, uploaded_by: getUserId(req),
      title: req.body.title || req.file.originalname,
      category: req.body.category || 'AUTRE',
      original_filename: req.file.originalname, mime_type: req.file.mimetype,
      file_size: req.file.size,
      file_data: `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`
    });
    res.status(201).json({ message: 'Document enregistré', document: doc });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/documents/patient/:patientId
router.post('/patient/:patientId', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Fichier requis' });
    const clinicId = getClinicId(req);
    const doc = await Document.create({
      patient_id: req.params.patientId, clinic_id: clinicId, uploaded_by: getUserId(req),
      title: req.body.title || req.file.originalname,
      category: req.body.category || 'AUTRE',
      original_filename: req.file.originalname, mime_type: req.file.mimetype,
      file_size: req.file.size,
      file_data: `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`
    });
    res.status(201).json({ message: 'Document enregistré', document: doc });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /:id/download
router.get('/:id/download', async (req, res) => {
  try {
    const clinicId = getClinicId(req);
    const where    = { id: req.params.id };
    if (clinicId) where.clinic_id = clinicId;
    const doc = await Document.findOne({ where });
    if (!doc) return res.status(404).json({ error: 'Document non trouvé' });
    return serveFile(doc, res, 'attachment');
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /:id/view
router.get('/:id/view', async (req, res) => {
  try {
    const clinicId = getClinicId(req);
    const where    = { id: req.params.id };
    if (clinicId) where.clinic_id = clinicId;
    const doc = await Document.findOne({ where });
    if (!doc) return res.status(404).json({ error: 'Document non trouvé' });
    return serveFile(doc, res, 'inline');
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /:id
router.delete('/:id', async (req, res) => {
  try {
    const clinicId = getClinicId(req);
    const where    = { id: req.params.id };
    if (clinicId) where.clinic_id = clinicId;
    const doc = await Document.findOne({ where });
    if (!doc) return res.status(404).json({ error: 'Document non trouvé' });
    await doc.destroy();
    res.json({ message: 'Document supprimé' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
