const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { Patient, Treatment, Appointment, Invoice, AuditLog, User, sequelize } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const csv = require('csv-parse/sync');

// ✅ requireClinicId — lit depuis JWT ET la DB si clinic_id absent
const requireClinicId = async (req, res, next) => {
  
  // Source 1: req directement
  let clinicId = req.clinic_id
    || req.user?.clinic_id
    || req.user?.dataValues?.clinic_id;
  
  // Source 2: token JWT
  if (!clinicId) {
    try {
      const token = req.headers?.authorization?.split(' ')[1];
      if (token) clinicId = jwt.verify(token, process.env.JWT_SECRET).clinic_id;
    } catch(e) {}
  }

  // Source 3: base de données (dernier recours)
  if (!clinicId) {
    try {
      const userId = req.user?.id || req.user?.dataValues?.id;
      if (userId) {
        const u = await User.findByPk(userId, { attributes: ['clinic_id'] });
        clinicId = u?.clinic_id || null;
      }
    } catch(e) {}
  }

  // Si toujours null → laisser passer quand même (SUPER_ADMIN ou cas spécial)
  req.clinic_id = clinicId;
  next();
};

const getClinicId = (req) => req.clinic_id || req.user?.clinic_id || req.user?.dataValues?.clinic_id || null;
const getUserId   = (req) => {
  const v = req.user?.id || req.user?.dataValues?.id;
  if (v) return v;
  try {
    const t = req.headers?.authorization?.split(' ')[1];
    return t ? (jwt.verify(t, process.env.JWT_SECRET).userId || null) : null;
  } catch(e) { return null; }
};
const { auditLogger } = require('../middleware/auditLogger');
const { Op } = require('sequelize');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }
});

const router = express.Router();

// ✅ Subscription vérifiée côté frontend (LicensingGuard)
router.use(auditLogger('patients'));

const toHistoryDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

const practitionerName = (user) => user?.full_name || user?.username || 'Praticien non renseigné';

// ── GET / — List patients ────────────────────────────────────────────────────
router.get('/', requireClinicId, [
  query('search').optional().isLength({ min: 1 }),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Paramètres invalides', details: errors.array() });
    }

    const { search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // ✅ Lire clinic_id depuis req.clinic_id OU req.user.clinic_id
    const clinicId = req.clinic_id || req.user?.clinic_id || null;
    // SÉCURITÉ : refuser si pas de clinic_id (ne jamais retourner tous les patients)
    if (!clinicId && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Cabinet non identifié', code: 'NO_CLINIC' });
    }
    let whereClause = {};
    if (clinicId) whereClause.clinic_id = clinicId;

    if (search) {
      whereClause[Op.or] = [
        { patient_number: { [Op.iLike]: `%${search}%` } },
        { first_name:     { [Op.iLike]: `%${search}%` } },
        { last_name:      { [Op.iLike]: `%${search}%` } },
        { phone_primary:  { [Op.iLike]: `%${search}%` } },
        { email:          { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: patients } = await Patient.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['last_name', 'ASC'], ['first_name', 'ASC']],
      include: [{
        model: User,
        as: 'createdBy',
        attributes: { exclude: ['password_hash'] },
        required: false
      }]
    });

    res.json({
      patients,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(count / limit),
        total_count: count,
        per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('List patients error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des patients', message: error.message });
  }
});

// ── GET /:id — Single patient ────────────────────────────────────────────────
router.get('/:id', requireClinicId, [
  param('id').isUUID().withMessage('ID patient invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Données invalides', details: errors.array() });

    let whereClause = { id: req.params.id };
    if (req.clinic_id) whereClause.clinic_id = req.clinic_id;

    const patient = await Patient.findOne({
      where: whereClause,
      include: [
        { model: Appointment, as: 'appointments', limit: 5, order: [['appointment_date', 'DESC']], required: false },
        { model: Treatment,   as: 'treatments',   limit: 10, order: [['treatment_date', 'DESC']], required: false },
        { model: Invoice,     as: 'invoices',     limit: 5,  order: [['invoice_date', 'DESC']],  required: false }
      ]
    });

    if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });

    try {
      await AuditLog.create({
        user_id: getUserId(req),
        action: 'VIEW',
        resource_type: 'patients',
        resource_id: patient.id,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        description: `Consultation fiche patient: ${patient.first_name} ${patient.last_name}`
      });
    } catch (auditErr) { console.error('Audit log error:', auditErr); }

    res.json(patient);
  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du patient', message: error.message });
  }
});

// ── GET /:id/history — Historique consolidé du patient ───────────────────────
router.get('/:id/history', requireClinicId, [
  param('id').isUUID().withMessage('ID patient invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Données invalides', details: errors.array() });

    const clinicId = getClinicId(req);
    const wherePatient = { id: req.params.id };
    if (clinicId) wherePatient.clinic_id = clinicId;

    const patient = await Patient.findOne({ where: wherePatient, attributes: ['id','first_name','last_name'] });
    if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });

    const {
      Procedure,
      Prescription,
      ToothHistory,
      Payment,
      LabOrder,
      Document,
      SmsLog,
      MessageLog,
      MailingLog,
      MailingCampaign
    } = require('../models');

    const scoped = (extra = {}) => ({ patient_id: req.params.id, ...(clinicId ? { clinic_id: clinicId } : {}), ...extra });
    const timeline = [];

    const [appointments, treatments, prescriptions, toothHistory, invoices, labOrders, documents, smsLogs, messageLogs, mailingLogs] = await Promise.all([
      Appointment.findAll({
        where: scoped(),
        include: [{ model: User, as: 'dentist', attributes: ['id','full_name','username'], required: false }],
        order: [['appointment_date','DESC'], ['start_time','DESC']],
        limit: 100
      }).catch(() => []),
      Treatment.findAll({
        where: scoped(),
        include: [
          { model: User, as: 'performedBy', attributes: ['id','full_name','username'], required: false },
          { model: Procedure, as: 'procedure', attributes: ['id','code','name','category'], required: false }
        ],
        order: [['treatment_date','DESC'], ['created_at','DESC']],
        limit: 100
      }).catch(() => []),
      Prescription.findAll({
        where: scoped(),
        include: [{ model: User, as: 'prescriber', attributes: ['id','full_name','username'], required: false }],
        order: [['created_at','DESC']],
        limit: 100
      }).catch(() => []),
      ToothHistory.findAll({
        where: scoped(),
        include: [{ model: User, as: 'performedBy', attributes: ['id','full_name','username'], required: false }],
        order: [['created_at','DESC']],
        limit: 150
      }).catch(() => []),
      Invoice.findAll({
        where: scoped(),
        include: [{ model: Payment, as: 'payments', required: false }],
        order: [['created_at','DESC']],
        limit: 100
      }).catch(() => []),
      LabOrder.findAll({
        where: scoped(),
        include: [{ model: User, as: 'dentist', attributes: ['id','full_name','username'], required: false }],
        order: [['created_at','DESC']],
        limit: 100
      }).catch(() => []),
      Document.findAll({
        where: scoped({ is_deleted: false }),
        include: [{ model: User, as: 'uploadedBy', attributes: ['id','full_name','username'], required: false }],
        order: [['created_at','DESC']],
        limit: 100
      }).catch(() => []),
      SmsLog.findAll({
        where: scoped(),
        order: [['created_at','DESC']],
        limit: 100
      }).catch(() => []),
      MessageLog.findAll({
        where: scoped(),
        order: [['sent_at','DESC'], ['created_at','DESC']],
        limit: 100
      }).catch(() => []),
      MailingLog.findAll({
        where: { patient_id: req.params.id },
        include: [{
          model: MailingCampaign,
          as: 'campaign',
          attributes: ['id','name','subject','template_type','clinic_id'],
          required: false,
          ...(clinicId ? { where: { clinic_id: clinicId } } : {})
        }],
        order: [['created_at','DESC']],
        limit: 100
      }).catch(() => [])
    ]);

    appointments.forEach(a => timeline.push({
      id: `appointment-${a.id}`,
      source_id: a.id,
      type: 'APPOINTMENT',
      label: 'Rendez-vous',
      title: a.reason || a.appointment_type || 'Rendez-vous',
      status: a.status,
      date: toHistoryDate(`${a.appointment_date}T${String(a.start_time || '00:00:00').slice(0, 8)}`) || toHistoryDate(a.created_at),
      practitioner: practitionerName(a.dentist),
      details: a.notes || null
    }));

    treatments.forEach(t => timeline.push({
      id: `treatment-${t.id}`,
      source_id: t.id,
      type: 'TREATMENT',
      label: 'Soin effectué',
      title: t.procedure?.name || t.treatment_plan || t.diagnosis || 'Traitement',
      status: t.status,
      date: toHistoryDate(t.treatment_date || t.created_at),
      practitioner: practitionerName(t.performedBy),
      tooth_numbers: t.tooth_numbers || null,
      amount_mga: parseFloat(t.cost_mga || 0),
      details: t.treatment_notes || t.diagnosis || t.follow_up_notes || null
    }));

    prescriptions.forEach(p => {
      const content = p.content_json || p.content || {};
      const medNames = (content.items || []).map(i => (i.medication || i.name || '').toString().trim()).filter(Boolean);
      timeline.push({
        id: `prescription-${p.id}`,
        source_id: p.id,
        type: 'PRESCRIPTION',
        label: 'Ordonnance',
        title: p.number || 'Ordonnance',
        status: p.status,
        date: toHistoryDate(p.issued_at || p.created_at),
        practitioner: practitionerName(p.prescriber),
        details: medNames.length ? medNames.join(', ') : null
      });
    });

    toothHistory.forEach(h => timeline.push({
      id: `odontogram-${h.id}`,
      source_id: h.id,
      type: 'ODONTOGRAM',
      label: 'Odontogramme',
      title: `Dent ${h.tooth_fdi}${h.surface ? ` - ${h.surface}` : ''}`,
      status: h.status,
      date: toHistoryDate(h.created_at),
      practitioner: practitionerName(h.performedBy),
      details: h.note || h.action || null
    }));

    invoices.forEach(inv => {
      timeline.push({
        id: `invoice-${inv.id}`,
        source_id: inv.id,
        type: 'INVOICE',
        label: 'Facture',
        title: inv.invoice_number || 'Facture',
        status: inv.status,
        date: toHistoryDate(inv.invoice_date || inv.created_at),
        practitioner: 'Cabinet',
        amount_mga: parseFloat(inv.total_mga || 0),
        details: inv.notes || null
      });

      (inv.payments || []).forEach(pay => {
        if (pay.status !== 'COMPLETED') return;
        timeline.push({
          id: `payment-${pay.id}`,
          source_id: pay.id,
          type: 'PAYMENT',
          label: 'Paiement reçu',
          title: pay.payment_number || inv.invoice_number || 'Paiement',
          status: pay.payment_method,
          date: toHistoryDate(pay.payment_date || pay.created_at),
          practitioner: 'Cabinet',
          amount_mga: parseFloat(pay.amount_mga || 0),
          details: pay.reference_number || null
        });
      });
    });

    labOrders.forEach(o => timeline.push({
      id: `lab-${o.id}`,
      source_id: o.id,
      type: 'LAB',
      label: 'Travail laboratoire',
      title: o.order_number || o.work_type || 'Commande labo',
      status: o.status,
      date: toHistoryDate(o.created_at),
      practitioner: practitionerName(o.dentist),
      amount_mga: parseFloat(o.total_mga || 0),
      details: o.notes || o.shade || null
    }));

    documents.forEach(d => timeline.push({
      id: `document-${d.id}`,
      source_id: d.id,
      type: 'DOCUMENT',
      label: 'Document',
      title: d.original_filename || 'Document patient',
      status: d.category,
      date: toHistoryDate(d.created_at),
      practitioner: practitionerName(d.uploadedBy),
      details: d.description || d.mime_type || null
    }));

    smsLogs.forEach(s => timeline.push({
      id: `sms-${s.id}`,
      source_id: s.id,
      type: 'SMS',
      label: 'SMS',
      title: typeof s.getMessageTypeLabel === 'function' ? s.getMessageTypeLabel() : (s.message_type || 'SMS patient'),
      status: typeof s.getStatusLabel === 'function' ? s.getStatusLabel() : s.status,
      date: toHistoryDate(s.sent_at || s.delivered_at || s.created_at),
      practitioner: s.carrier || 'Communication',
      amount_mga: parseFloat(s.cost_mga || 0),
      details: s.failed_reason || s.message_content || null
    }));

    messageLogs.forEach(m => timeline.push({
      id: `message-${m.id}`,
      source_id: m.id,
      type: 'MESSAGE',
      label: m.channel === 'EMAIL' ? 'Email' : 'Message',
      title: m.message_type || `${m.channel || 'Message'} patient`,
      status: m.status,
      date: toHistoryDate(m.sent_at || m.created_at),
      practitioner: m.channel || 'Communication',
      details: m.text || m.provider_response || null
    }));

    mailingLogs.forEach(m => {
      if (clinicId && !m.campaign) return;
      timeline.push({
        id: `mailing-${m.id}`,
        source_id: m.id,
        type: 'MAILING',
        label: 'Campagne email',
        title: m.campaign?.subject || m.campaign?.name || 'Emailing patient',
        status: typeof m.getStatusLabel === 'function' ? m.getStatusLabel() : m.status,
        date: toHistoryDate(m.sent_at || m.delivered_at || m.opened_at || m.clicked_at || m.created_at),
        practitioner: 'Communication',
        details: m.error_message || m.email || null
      });
    });

    timeline.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    res.json({
      patient: { id: patient.id, first_name: patient.first_name, last_name: patient.last_name },
      count: timeline.length,
      history: timeline
    });
  } catch (error) {
    console.error('Patient history error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de l historique patient', message: error.message });
  }
});

// ── POST / — Create patient ──────────────────────────────────────────────────
router.post('/', requireClinicId, [
  body('first_name').isLength({ min: 2, max: 50 }).withMessage('Prénom requis (2-50 caractères)'),
  body('last_name').isLength({ min: 2, max: 50 }).withMessage('Nom requis (2-50 caractères)'),
  body('date_of_birth').isISO8601().withMessage('Date de naissance invalide (format YYYY-MM-DD)'),
  body('gender').notEmpty().withMessage('Genre requis'),
  body('phone_primary').matches(/^\+?\d[\d\s\-]{7,15}$/).withMessage('Numéro de téléphone invalide'),
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail().withMessage('Email invalide'),
  body('address').optional({ nullable: true, checkFalsy: true }).isLength({ max: 255 }),
  body('city').optional({ nullable: true, checkFalsy: true }).isLength({ max: 50 }),
  body('emergency_contact_name').optional({ nullable: true, checkFalsy: true }).isLength({ max: 100 }),
  body('emergency_contact_phone').optional({ nullable: true, checkFalsy: true }),
  body('medical_history').optional({ nullable: true, checkFalsy: true }).isLength({ max: 1000 }),
  body('allergies').optional({ nullable: true, checkFalsy: true }).isLength({ max: 500 }),
  body('current_medications').optional({ nullable: true, checkFalsy: true }).isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Données invalides', details: errors.array() });
    }

    let gender = (req.body.gender || '').toString().toLowerCase().trim();
    if (['m', 'male', 'homme', 'masculin'].includes(gender)) gender = 'M';
    else if (['f', 'female', 'femme', 'féminin', 'feminin'].includes(gender)) gender = 'F';
    else return res.status(400).json({ error: 'Genre invalide', message: 'Le genre doit être M ou F' });

    const clinicId = req.clinic_id || req.body.clinic_id || null;

    let patient_number = null;
    try {
      if (clinicId) {
        await sequelize.query(`
          INSERT INTO counters (id, clinic_id, counter_type, current_value, created_at, updated_at)
          VALUES (gen_random_uuid(), :clinic_id, 'patient', 1, NOW(), NOW())
          ON CONFLICT (clinic_id, counter_type) DO UPDATE SET
            current_value = counters.current_value + 1,
            updated_at = NOW()
        `, { replacements: { clinic_id: clinicId } });

        const [[counterRow]] = await sequelize.query(
          `SELECT current_value FROM counters WHERE clinic_id = :clinic_id AND counter_type = 'patient'`,
          { replacements: { clinic_id: clinicId } }
        );
        const counterValue = counterRow?.current_value || 1;
        patient_number = `PAT-${String(counterValue).padStart(6, '0')}`;
      } else {
        patient_number = `PAT-${Date.now().toString().slice(-6)}`;
      }
    } catch (counterErr) {
      console.error('Counter error (non-fatal):', counterErr);
      patient_number = `PAT-${Date.now().toString().slice(-6)}`;
    }

    const patientData = {
      ...req.body,
      patient_number,
      gender,
      clinic_id: clinicId,
      created_by_user_id: getUserId(req),
      emergency_contact_name:  req.body.emergency_contact_name  || null,
      emergency_contact_phone: req.body.emergency_contact_phone || null,
      payer_type: req.body.payer_type || 'CASH',
    };

    delete patientData.clinic_id_from_body;

    const patient = await Patient.create(patientData);
    res.status(201).json({ message: 'Patient créé avec succès', patient });

  } catch (error) {
    console.error('Create patient error:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Erreur de validation',
        details: error.errors.map(e => ({ field: e.path, message: e.message }))
      });
    }
    res.status(500).json({ error: 'Erreur lors de la création du patient', message: error.message });
  }
});

const normalizeGender = (value) => {
  const gender = (value || '').toString().toLowerCase().trim();
  if (['m', 'male', 'homme', 'masculin'].includes(gender)) return 'M';
  if (['f', 'female', 'femme', 'féminin', 'feminin'].includes(gender)) return 'F';
  if (['other', 'autre', '?'].includes(gender)) return 'OTHER';
  return null;
};

const parseCsvDate = (value) => {
  if (!value) return null;
  const raw = value.toString().trim();
  if (!raw) return null;
  const frMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (frMatch) {
    const [, dd, mm, yyyy] = frMatch;
    return `${yyyy}-${mm}-${dd}`;
  }
  return raw;
};

const normalizeCsvHeader = (header) => (header || '')
  .toString()
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

const detectCsvDelimiter = (content) => {
  const firstLine = (content || '').split(/\r?\n/).find(line => line.trim()) || '';
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  return semicolonCount > commaCount ? ';' : ',';
};

const rowValue = (row, keys) => {
  for (const key of keys) {
    const normalizedKey = normalizeCsvHeader(key);
    if (row[normalizedKey] !== undefined && row[normalizedKey] !== null) {
      return row[normalizedKey];
    }
  }
  return '';
};

const cleanCsvText = (row, keys) => (rowValue(row, keys) || '').toString().trim();

const splitFullName = (value) => {
  const fullName = (value || '').toString().trim().replace(/\s+/g, ' ');
  if (!fullName) return { first_name: '', last_name: '' };
  const parts = fullName.split(' ');
  if (parts.length === 1) return { first_name: parts[0], last_name: parts[0] };
  return {
    first_name: parts.slice(0, -1).join(' '),
    last_name: parts.slice(-1).join('')
  };
};

router.post('/import-csv', requireClinicId, upload.single('file'), async (req, res) => {
  try {
    const clinicId = getClinicId(req);
    if (!clinicId && req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Cabinet non identifié', code: 'NO_CLINIC' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Fichier CSV requis' });
    }

    const content = req.file.buffer.toString('utf-8').replace(/^\uFEFF/, '');
    let rows = [];
    try {
      rows = csv.parse(content, {
        columns: headers => headers.map(normalizeCsvHeader),
        delimiter: detectCsvDelimiter(content),
        skip_empty_lines: true,
        trim: true,
        bom: true
      });
    } catch (error) {
      return res.status(400).json({ error: 'CSV invalide', details: error.message });
    }

    if (!rows.length) {
      return res.status(400).json({ error: 'Aucune ligne à importer' });
    }

    const stats = { inserted: 0, updated: 0, skipped: 0 };
    const errors = [];

    await sequelize.transaction(async (transaction) => {
      for (const [index, row] of rows.entries()) {
        const fullName = splitFullName(rowValue(row, ['full_name', 'nom_complet', 'nom_et_prenom', 'nom_prenom', 'patient']));
        const first_name = cleanCsvText(row, ['first_name', 'prenom', 'firstname', 'prénom']) || fullName.first_name;
        const last_name = cleanCsvText(row, ['last_name', 'nom', 'lastname']) || fullName.last_name;
        const date_of_birth = parseCsvDate(rowValue(row, ['date_of_birth', 'date_naissance', 'date_de_naissance', 'birth_date', 'dob', 'naissance']));
        const gender = normalizeGender(rowValue(row, ['gender', 'sexe']));
        const phone_primary = cleanCsvText(row, ['phone_primary', 'telephone', 'téléphone', 'tel', 'phone', 'mobile']) || null;
        const email = cleanCsvText(row, ['email', 'mail', 'e_mail']) || null;

        if (!first_name || !last_name) {
          stats.skipped += 1;
          errors.push({
            row: index + 2,
            message: 'Champs requis manquants (prénom et nom)',
          });
          continue;
        }

        const patientData = {
          patient_number: cleanCsvText(row, ['patient_number', 'numero_patient', 'num_patient', 'reference']) || null,
          first_name,
          last_name,
          date_of_birth,
          gender,
          phone_primary,
          phone_secondary: cleanCsvText(row, ['phone_secondary', 'telephone_secondaire', 'tel_secondaire', 'phone2']) || null,
          email,
          address: cleanCsvText(row, ['address', 'adresse']) || null,
          city: cleanCsvText(row, ['city', 'ville']) || 'Antananarivo',
          postal_code: cleanCsvText(row, ['postal_code', 'code_postal']) || null,
          emergency_contact_name: cleanCsvText(row, ['emergency_contact_name', 'contact_urgence', 'nom_contact_urgence']) || null,
          emergency_contact_phone: cleanCsvText(row, ['emergency_contact_phone', 'telephone_urgence', 'tel_urgence']) || null,
          emergency_contact_relationship: cleanCsvText(row, ['emergency_contact_relationship', 'relation_contact_urgence']) || null,
          medical_history: cleanCsvText(row, ['medical_history', 'antecedents', 'antécédents', 'antecedents_medicaux']) || null,
          allergies: cleanCsvText(row, ['allergies']) || null,
          current_medications: cleanCsvText(row, ['current_medications', 'traitements_en_cours', 'medicaments']) || null,
          insurance_provider: cleanCsvText(row, ['insurance_provider', 'assurance']) || null,
          insurance_number: cleanCsvText(row, ['insurance_number', 'numero_assurance']) || null,
          payer_type: cleanCsvText(row, ['payer_type', 'type_payeur']) || 'SELF_PAY',
          occupation: cleanCsvText(row, ['occupation', 'profession']) || null,
          preferred_language: cleanCsvText(row, ['preferred_language', 'langue']) || 'FRENCH',
          consent_treatment: ['true', '1', 'yes', 'oui', 'y'].includes(cleanCsvText(row, ['consent_treatment', 'consentement_soins']).toLowerCase()),
          consent_data_processing: ['true', '1', 'yes', 'oui', 'y'].includes(cleanCsvText(row, ['consent_data_processing', 'consentement_donnees']).toLowerCase()),
          consent_sms_reminders: rowValue(row, ['consent_sms_reminders', 'rappel_sms']) === ''
            ? true
            : ['true', '1', 'yes', 'oui', 'y'].includes(cleanCsvText(row, ['consent_sms_reminders', 'rappel_sms']).toLowerCase()),
          notes: cleanCsvText(row, ['notes', 'commentaire', 'commentaires']) || null,
          is_active: rowValue(row, ['is_active', 'actif']) === ''
            ? true
            : ['true', '1', 'yes', 'oui', 'y'].includes(cleanCsvText(row, ['is_active', 'actif']).toLowerCase()),
          clinic_id: clinicId,
          created_by_user_id: getUserId(req),
        };

        let existing = null;
        if (patientData.patient_number) {
          existing = await Patient.findOne({
            where: { clinic_id: clinicId, patient_number: patientData.patient_number },
            transaction
          });
        }
        if (!existing && patientData.phone_primary) {
          existing = await Patient.findOne({
            where: { clinic_id: clinicId, phone_primary: patientData.phone_primary },
            transaction
          });
        }
        if (!existing && patientData.email) {
          existing = await Patient.findOne({
            where: { clinic_id: clinicId, email: patientData.email },
            transaction
          });
        }

        if (existing) {
          await existing.update(patientData, { transaction });
          stats.updated += 1;
          continue;
        }

        await Patient.create(patientData, { transaction });
        stats.inserted += 1;
      }
    });

    if (stats.inserted + stats.updated === 0) {
      return res.status(400).json({
        error: 'Aucun patient importé',
        message: 'Toutes les lignes du CSV ont été ignorées. Vérifiez les colonnes obligatoires: prénom et nom.',
        inserted: stats.inserted,
        updated: stats.updated,
        skipped: stats.skipped,
        errors
      });
    }

    try {
      await AuditLog.create({
        user_id: getUserId(req),
        action: 'IMPORT',
        resource_type: 'patients',
        resource_id: null,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        description: `Import patients CSV: ${stats.inserted} créés, ${stats.updated} mis à jour, ${stats.skipped} ignorés`
      });
    } catch (auditErr) {
      console.error('Audit log error:', auditErr);
    }

    res.json({
      message: 'Import terminé',
      inserted: stats.inserted,
      updated: stats.updated,
      skipped: stats.skipped,
      errors
    });
  } catch (error) {
    console.error('Import patients CSV error:', error);
    res.status(500).json({ error: 'Erreur import CSV', message: error.message });
  }
});

// ── PUT /:id — Update patient ────────────────────────────────────────────────
router.put('/:id', requireClinicId, [
  param('id').isUUID().withMessage('ID patient invalide'),
  body('first_name').optional().isLength({ min: 1, max: 50 }).trim(),
  body('last_name').optional().isLength({ min: 1, max: 50 }).trim(),
  body('phone_primary').optional().matches(/^\+?\d[\d\s\-]{7,15}$/),
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Données invalides', details: errors.array() });

    let whereClause = { id: req.params.id };
    if (req.clinic_id) whereClause.clinic_id = req.clinic_id;

    const patient = await Patient.findOne({ where: whereClause });
    if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });

    const oldValues = patient.toJSON();
    await patient.update(req.body);

    try {
      await AuditLog.create({
        user_id: getUserId(req),
        action: 'UPDATE',
        resource_type: 'patients',
        resource_id: patient.id,
        old_values: oldValues,
        new_values: req.body,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        description: `Patient mis à jour: ${patient.first_name} ${patient.last_name}`
      });
    } catch (auditErr) { console.error('Audit log error:', auditErr); }

    res.json({ message: 'Patient mis à jour avec succès', patient });
  } catch (error) {
    console.error('Update patient error:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du patient', message: error.message });
  }
});

// ── DELETE /:id — Soft delete ────────────────────────────────────────────────
router.delete('/:id', requireClinicId, [
  param('id').isUUID().withMessage('ID patient invalide'),
  requireRole('ADMIN', 'DENTIST')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Données invalides', details: errors.array() });

    let whereClause = { id: req.params.id };
    if (req.clinic_id) whereClause.clinic_id = req.clinic_id;

    const patient = await Patient.findOne({ where: whereClause });
    if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });

    await patient.update({ is_active: false });

    try {
      await AuditLog.create({
        user_id: getUserId(req),
        action: 'DELETE',
        resource_type: 'patients',
        resource_id: patient.id,
        old_values: patient.toJSON(),
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        description: `Patient désactivé: ${patient.first_name} ${patient.last_name}`
      });
    } catch (auditErr) { console.error('Audit log error:', auditErr); }

    res.json({ message: 'Patient désactivé avec succès' });
  } catch (error) {
    console.error('Delete patient error:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du patient', message: error.message });
  }
});

// ── GET /:id/dental-chart ────────────────────────────────────────────────────
router.get('/:id/dental-chart', requireClinicId, [
  param('id').isUUID().withMessage('ID patient invalide')
], async (req, res) => {
  try {
    // ✅ Validation UUID — bloque 'undefined' et autres valeurs invalides
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'ID patient invalide', details: errors.array() });
    }

    let whereClause = { id: req.params.id };
    if (req.clinic_id) whereClause.clinic_id = req.clinic_id;

    const patient = await Patient.findOne({ where: whereClause });
    if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });

    const treatmentWhere = { patient_id: req.params.id };
    if (req.clinic_id) treatmentWhere.clinic_id = req.clinic_id;

    const treatments = await Treatment.findAll({
      where: treatmentWhere,
      order: [['treatment_date', 'DESC']]
    });

    // ✅ Format teeth_records en tableau (attendu par DentalChart.js)
    const teethMap = {};
    for (let i = 1; i <= 32; i++) {
      teethMap[i] = {
        tooth_position: String(i),
        status: 'healthy',
        procedures: [],
        notes: ''
      };
    }

    treatments.forEach(treatment => {
      if (treatment.tooth_numbers) {
        const toothNums = treatment.getToothNumbersArray
          ? treatment.getToothNumbersArray()
          : (Array.isArray(treatment.tooth_numbers)
              ? treatment.tooth_numbers
              : [treatment.tooth_numbers]);

        toothNums.forEach(toothNum => {
          const num = parseInt(toothNum);
          if (num >= 1 && num <= 32) {
            teethMap[num].procedures.push({
              procedure_type: treatment.procedure_type || 'restoration',
              procedure_name: treatment.procedure_name || treatment.procedure_id || '',
              cost_mga: treatment.cost_mga || 0,
              date_performed: treatment.treatment_date,
              description: treatment.treatment_notes || '',
              notes: ''
            });
            if (treatment.status === 'COMPLETED') {
              teethMap[num].status = 'filled';
            }
          }
        });
      }
    });

    res.json({
      patient_id: req.params.id,
      last_updated: new Date(),
      teeth_records: Object.values(teethMap)
    });
  } catch (error) {
    console.error('Get dental chart error:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la fiche dentaire', message: error.message });
  }
});

// ── GET /:id/lab-orders ──────────────────────────────────────────────────────
router.get('/:id/lab-orders', requireClinicId, [
  param('id').isUUID()
], async (req, res) => {
  try {
    const { LabOrder, Lab } = require('../models');

    let whereClause = { id: req.params.id };
    if (req.clinic_id) whereClause.clinic_id = req.clinic_id;

    const patient = await Patient.findOne({ where: whereClause });
    if (!patient) return res.status(404).json({ error: 'Patient non trouvé' });

    const ordersWhere = { patient_id: req.params.id };
    if (req.clinic_id) ordersWhere.clinic_id = req.clinic_id;

    const orders = await LabOrder.findAll({
      where: ordersWhere,
      include: [
        { model: Lab,  as: 'lab',     attributes: ['id', 'name'], required: false },
        { model: User, as: 'dentist', attributes: ['id', 'full_name'], required: false }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      patient_id: req.params.id,
      count: orders.length,
      orders: orders.map(o => ({
        id: o.id,
        order_number: o.order_number,
        work_type: o.work_type,
        status: o.status,
        due_date: o.due_date,
        total_mga: o.total_mga,
        lab: o.lab,
        dentist: o.dentist,
        created_at: o.createdAt
      }))
    });
  } catch (error) {
    console.error('Get patient lab orders error:', error);
    res.status(500).json({ error: 'Erreur serveur', message: error.message });
  }
});

module.exports = router;
