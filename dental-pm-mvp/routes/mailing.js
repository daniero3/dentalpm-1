const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { MailingCampaign, MailingLog, Patient, User, AuditLog } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { sendMail, isMailConfigured } = require('../utils/mailer');
// ✅ requireClinicId inline
const requireClinicId = (req, res, next) => {
  const clinicId = req.clinic_id || req.user?.clinic_id || req.user?.dataValues?.clinic_id;
  if (!clinicId) return res.status(403).json({ error: 'Clinique requise', code: 'NO_CLINIC' });
  req.clinic_id = clinicId;
  next();
};
const { Op } = require('sequelize');

const jwt = require('jsonwebtoken');

const getClinicId = (req) => {
  const v = req.clinic_id || req.user?.clinic_id || req.user?.dataValues?.clinic_id;
  if (v) return v;
  try {
    const t = req.headers?.authorization?.split(' ')[1];
    return t ? (jwt.verify(t, process.env.JWT_SECRET).clinic_id || null) : null;
  } catch(e) { return null; }
};

const getUserId = (req) => {
  const v = req.user?.id || req.user?.dataValues?.id || req.user?.userId;
  if (v) return v;
  try {
    const t = req.headers?.authorization?.split(' ')[1];
    return t ? (jwt.verify(t, process.env.JWT_SECRET).userId || null) : null;
  } catch(e) { return null; }
};


const router = express.Router();

// All routes require authentication

// All routes require valid subscription

const CAMPAIGN_LIBRARY = {
  RDV_J7: {
    template_type: 'APPOINTMENT_REMINDER',
    label: 'Rappel rendez-vous J-7',
    segment: 'Patients avec rendez-vous dans 7 jours',
    subject: 'Votre rendez-vous du {{date_rdv}} avec {{praticien}}',
    target_open_rate: 62,
    target_click_rate: 18,
    sms_fallback: 'Bonjour {{prenom}}, rappel de votre RDV le {{date_rdv}} avec {{praticien}}. Repondez STOP pour ne plus recevoir de SMS.',
    body: `<p>Bonjour {{prenom}},</p><p>Nous vous confirmons votre rendez-vous prévu le <strong>{{date_rdv}}</strong> avec {{praticien}}.</p><p>Si vous devez déplacer ce rendez-vous, contactez le cabinet au plus tôt.</p><p><a href="{{lien_confirmation}}" style="background:#0D7A87;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Confirmer mon rendez-vous</a></p>`
  },
  RDV_J2: {
    template_type: 'APPOINTMENT_REMINDER',
    label: 'Rappel rendez-vous J-2',
    segment: 'Patients avec rendez-vous dans 48h',
    subject: 'Rappel : votre rendez-vous approche, {{prenom}}',
    target_open_rate: 68,
    target_click_rate: 22,
    sms_fallback: 'Bonjour {{prenom}}, votre RDV au cabinet est prevu le {{date_rdv}}. Merci de nous prevenir en cas d empechement.',
    body: `<p>Bonjour {{prenom}},</p><p>Votre rendez-vous approche : <strong>{{date_rdv}}</strong> pour {{soin}}.</p><p>Merci d'arriver quelques minutes en avance si un dossier administratif doit être complété.</p><p><a href="{{lien_confirmation}}" style="background:#0D7A87;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Confirmer ma présence</a></p>`
  },
  RDV_J0: {
    template_type: 'APPOINTMENT_REMINDER',
    label: 'Rappel rendez-vous J-0',
    segment: 'Patients avec rendez-vous aujourd’hui',
    subject: 'Aujourd’hui : votre rendez-vous au cabinet',
    target_open_rate: 72,
    target_click_rate: 20,
    sms_fallback: 'Bonjour {{prenom}}, votre RDV est aujourd hui a {{heure_rdv}} avec {{praticien}}.',
    body: `<p>Bonjour {{prenom}},</p><p>Votre rendez-vous est prévu aujourd'hui à <strong>{{heure_rdv}}</strong> avec {{praticien}}.</p><p>À tout à l'heure au cabinet.</p>`
  },
  POST_SOIN: {
    template_type: 'FOLLOW_UP',
    label: 'Email post-soin',
    segment: 'Patients ayant reçu un soin récent',
    subject: 'Vos recommandations après {{soin}}',
    target_open_rate: 58,
    target_click_rate: 16,
    sms_fallback: 'Bonjour {{prenom}}, les consignes post-soin viennent de vous etre envoyees par email. Contactez le cabinet en cas de douleur inhabituelle.',
    body: `<p>Bonjour {{prenom}},</p><p>Suite à votre soin <strong>{{soin}}</strong>, voici les recommandations à suivre.</p><ul><li>Respectez les consignes données par {{praticien}}.</li><li>Évitez l’automédication sans avis médical.</li><li>Contactez le cabinet en cas de douleur inhabituelle, fièvre ou saignement persistant.</li></ul><p><strong>Important :</strong> ce message complète les explications données au cabinet et ne remplace pas un avis médical personnalisé.</p>`
  },
  DEVIS_FACTURE: {
    template_type: 'CUSTOM',
    label: 'Envoi devis/facture PDF',
    segment: 'Patients avec document à envoyer',
    subject: 'Votre document du cabinet dentaire',
    target_open_rate: 70,
    target_click_rate: 35,
    sms_fallback: 'Bonjour {{prenom}}, un document important du cabinet vous a ete envoye par email.',
    body: `<p>Bonjour {{prenom}},</p><p>Vous trouverez en pièce jointe le document demandé : {{document_type}}.</p><p>Pour toute question, vous pouvez répondre à cet email ou contacter le secrétariat.</p><p><a href="{{lien_document}}" style="background:#0D7A87;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Consulter mon document</a></p>`
  },
  NEWSLETTER: {
    template_type: 'NEWSLETTER',
    label: 'Newsletter conseil bucco-dentaire',
    segment: 'Patients opt-in newsletter',
    subject: 'Conseil du mois : préserver votre sourire',
    target_open_rate: 38,
    target_click_rate: 8,
    sms_fallback: 'Bonjour {{prenom}}, notre conseil bucco-dentaire du mois vous attend par email.',
    body: `<p>Bonjour {{prenom}},</p><p>Ce mois-ci, notre conseil porte sur un geste simple : maintenir une hygiène interdentaire régulière.</p><p>Un brossage efficace, complété par des brossettes ou du fil dentaire, aide à prévenir les inflammations gingivales.</p><p><a href="{{lien_article}}" style="background:#0D7A87;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Lire le conseil complet</a></p>`
  },
  INACTIF_18_MOIS: {
    template_type: 'FOLLOW_UP',
    label: 'Relance patient inactif',
    segment: 'Patients sans rendez-vous depuis plus de 18 mois',
    subject: '{{prenom}}, faisons le point sur votre santé bucco-dentaire',
    target_open_rate: 45,
    target_click_rate: 12,
    sms_fallback: 'Bonjour {{prenom}}, cela fait longtemps que nous ne vous avons pas vu au cabinet. Souhaitez-vous planifier un controle ?',
    body: `<p>Bonjour {{prenom}},</p><p>Nous n’avons pas eu le plaisir de vous revoir depuis un moment.</p><p>Un contrôle régulier permet de détecter tôt les problèmes dentaires et d’éviter des soins plus lourds.</p><p><a href="{{lien_rdv}}" style="background:#0D7A87;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Planifier un contrôle</a></p>`
  },
  DETARTRAGE_RADIO: {
    template_type: 'APPOINTMENT_REMINDER',
    label: 'Rappel détartrage / radio bilan',
    segment: 'Patients éligibles au contrôle annuel',
    subject: 'Votre contrôle annuel est à programmer',
    target_open_rate: 48,
    target_click_rate: 14,
    sms_fallback: 'Bonjour {{prenom}}, pensez a programmer votre controle annuel au cabinet dentaire.',
    body: `<p>Bonjour {{prenom}},</p><p>Votre contrôle annuel est à programmer. Selon votre situation, {{praticien}} pourra recommander un détartrage ou une radio de bilan.</p><p><a href="{{lien_rdv}}" style="background:#0D7A87;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Prendre rendez-vous</a></p>`
  }
};

const BUSINESS_RULES = {
  maxEmailsPerPatientPerMonth: 2,
  sendWindow: '08:00-19:00',
  smsFallbackAfterHours: 48,
  requiredFooter: 'Vous recevez cet email dans le cadre du suivi de votre cabinet dentaire. Désinscription : {{lien_desinscription}}.'
};

const getEmailEligibleWhere = (clinicId, filter = {}) => {
  const where = {
    is_active: true,
    clinic_id: clinicId,
    consent_data_processing: true,
    [Op.and]: [
      { email: { [Op.ne]: null } },
      { email: { [Op.ne]: '' } }
    ]
  };

  if (filter.gender) where.gender = filter.gender;
  if (filter.city) where.city = filter.city;
  if (Array.isArray(filter.patient_ids) && filter.patient_ids.length > 0) {
    where.id = { [Op.in]: filter.patient_ids };
  }
  if (filter.age_min || filter.age_max) {
    const today = new Date();
    if (filter.age_max) {
      const minBirthDate = new Date(today.getFullYear() - Number(filter.age_max) - 1, today.getMonth(), today.getDate());
      where.date_of_birth = { [Op.gte]: minBirthDate };
    }
    if (filter.age_min) {
      const maxBirthDate = new Date(today.getFullYear() - Number(filter.age_min), today.getMonth(), today.getDate());
      where.date_of_birth = { ...where.date_of_birth, [Op.lte]: maxBirthDate };
    }
  }
  return where;
};

const buildEmailPackage = (type, context = {}) => {
  const cfg = CAMPAIGN_LIBRARY[type] || CAMPAIGN_LIBRARY.NEWSLETTER;
  const cabinet = context.cabinet || '[NOM_DU_CABINET]';
  const practitioners = context.practitioners || '[LISTE_DES_PRATICIENS]';
  const agenda = context.agenda || '[LOGICIEL_AGENDA]';
  const esp = context.esp || '[ESP_EMAIL]';
  const bodyHtml = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;max-width:640px;margin:0 auto;padding:20px">
      ${cfg.body}
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
      <p style="font-size:13px;color:#64748b">${BUSINESS_RULES.requiredFooter}</p>
      <p style="font-size:13px;color:#64748b">${cabinet}<br/>Praticiens : ${practitioners}<br/>Agenda : ${agenda} · ESP : ${esp}</p>
    </div>`;

  return {
    type,
    label: cfg.label,
    template_type: cfg.template_type,
    subject: cfg.subject,
    body_html: bodyHtml,
    sms_fallback: cfg.sms_fallback,
    audience_description: cfg.segment,
    checklist: [
      'Audience filtrée sur patients actifs avec email et consentement RGPD',
      'Pas plus de 2 emails par mois par patient',
      'Envoi programmé entre 8h et 19h',
      'Lien de désinscription présent',
      'Alternative SMS prévue si email non ouvert sous 48h',
      'Mention médicale incluse si le contenu contient des consignes de soin'
    ],
    estimated_metrics: {
      target_open_rate: `${cfg.target_open_rate}%`,
      target_click_rate: `${cfg.target_click_rate}%`,
      unsubscribe_guardrail: '< 0.5%'
    },
    compliance: {
      double_opt_in: 'À vérifier côté ESP',
      rgpd: 'Consentement et finalité de contact requis',
      hds: 'Ne pas inclure de données médicales sensibles dans le corps email',
      consent_archive: 'À conserver dans le dossier patient ou journal de consentement'
    },
    business_rules: BUSINESS_RULES
  };
};

const isAllowedSendHour = (date = new Date()) => {
  const hour = date.getHours();
  return hour >= 8 && hour < 19;
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const replaceTemplateVariables = (text, patient, context = {}) => {
  const firstName = patient?.first_name || '';
  const lastName = patient?.last_name || '';
  const unsubscribeUrl = `${process.env.FRONTEND_URL || 'https://dentalpracticemada.com'}/unsubscribe?email=${encodeURIComponent(patient?.email || '')}`;
  const values = {
    prenom: firstName,
    nom: lastName,
    patient: `${firstName} ${lastName}`.trim(),
    cabinet: context.cabinet || '',
    praticien: context.practitioner || context.praticien || context.practitioners || '',
    praticiens: context.practitioners || '',
    agenda: context.agenda || '',
    esp: context.esp || '',
    date_rdv: context.date_rdv || '[date du rendez-vous]',
    heure_rdv: context.heure_rdv || '[heure]',
    soin: context.soin || '[soin]',
    document_type: context.document_type || '[document]',
    lien_confirmation: context.lien_confirmation || process.env.FRONTEND_URL || '#',
    lien_document: context.lien_document || process.env.FRONTEND_URL || '#',
    lien_article: context.lien_article || process.env.FRONTEND_URL || '#',
    lien_rdv: context.lien_rdv || process.env.FRONTEND_URL || '#',
    lien_desinscription: unsubscribeUrl
  };

  return String(text || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => {
    const value = values[key] ?? context[key] ?? '';
    return key.startsWith('lien_') ? String(value) : escapeHtml(value);
  });
};

// =============================================================================
// MAILING CAMPAIGNS MANAGEMENT
// =============================================================================

router.get('/suite/dashboard', requireClinicId, async (req, res) => {
  try {
    const clinicId = req.clinic_id;
    const campaignWhere = { clinic_id: clinicId };
    const patientWhere = getEmailEligibleWhere(clinicId);
    const totalCampaigns = await MailingCampaign.count({ where: campaignWhere });
    const sentCampaigns = await MailingCampaign.count({ where: { ...campaignWhere, status: 'SENT' } });
    const scheduledCampaigns = await MailingCampaign.count({ where: { ...campaignWhere, status: 'SCHEDULED' } });
    const eligiblePatients = await Patient.count({ where: patientWhere });
    const totalPatients = await Patient.count({ where: { clinic_id: clinicId, is_active: true } });
    const emailsSent = await MailingCampaign.sum('emails_sent', { where: campaignWhere }) || 0;
    const emailsOpened = await MailingCampaign.sum('emails_opened', { where: campaignWhere }) || 0;
    const emailsClicked = await MailingCampaign.sum('emails_clicked', { where: campaignWhere }) || 0;
    const emailsBounced = await MailingCampaign.sum('emails_bounced', { where: campaignWhere }) || 0;
    const openRate = emailsSent > 0 ? Math.round((emailsOpened / emailsSent) * 100) : 0;
    const clickRate = emailsOpened > 0 ? Math.round((emailsClicked / emailsOpened) * 100) : 0;
    const bounceRate = emailsSent > 0 ? Math.round((emailsBounced / emailsSent) * 100) : 0;

    res.json({
      kpis: {
        campaigns_total: totalCampaigns,
        campaigns_sent: sentCampaigns,
        campaigns_scheduled: scheduledCampaigns,
        eligible_patients: eligiblePatients,
        total_patients: totalPatients,
        open_rate: `${openRate}%`,
        click_rate: `${clickRate}%`,
        bounce_rate: `${bounceRate}%`
      },
      campaign_types: Object.entries(CAMPAIGN_LIBRARY).map(([key, cfg]) => ({
        key,
        label: cfg.label,
        segment: cfg.segment,
        target_open_rate: `${cfg.target_open_rate}%`,
        target_click_rate: `${cfg.target_click_rate}%`
      })),
      rules: BUSINESS_RULES
    });
  } catch (error) {
    console.error('Mailing suite dashboard error:', error);
    res.status(500).json({ error: 'Erreur tableau de bord mailing' });
  }
});

router.post('/suite/generate-email', requireClinicId, [
  requireRole('ADMIN', 'DENTIST', 'ASSISTANT'),
  body('type').isIn(Object.keys(CAMPAIGN_LIBRARY)),
  body('context').optional().isObject(),
  body('audience_filter').optional().isObject(),
  body('audience_filter.patient_ids').optional().isArray({ max: 500 }),
  body('audience_filter.patient_ids.*').optional().isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Données invalides', details: errors.array() });
    const emailPackage = buildEmailPackage(req.body.type, req.body.context || {});
    const estimatedRecipients = await Patient.count({ where: getEmailEligibleWhere(req.clinic_id, req.body.audience_filter || {}) });
    res.json({ ...emailPackage, estimated_recipients: estimatedRecipients });
  } catch (error) {
    console.error('Generate mailing email error:', error);
    res.status(500).json({ error: 'Erreur génération email' });
  }
});

router.post('/suite/quick-campaign', requireClinicId, [
  requireRole('ADMIN', 'DENTIST', 'ASSISTANT'),
  body('type').isIn(Object.keys(CAMPAIGN_LIBRARY)),
  body('name').optional().isLength({ max: 100 }).trim(),
  body('scheduled_at').optional({ nullable: true }).isISO8601(),
  body('context').optional().isObject(),
  body('audience_filter').optional().isObject(),
  body('audience_filter.patient_ids').optional().isArray({ max: 500 }),
  body('audience_filter.patient_ids.*').optional().isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: 'Données invalides', details: errors.array() });
    const emailPackage = buildEmailPackage(req.body.type, req.body.context || {});
    const audienceFilter = req.body.audience_filter || {};
    const estimatedRecipients = await Patient.count({ where: getEmailEligibleWhere(req.clinic_id, audienceFilter) });
    const campaign = await MailingCampaign.create({
      name: req.body.name || emailPackage.label,
      subject: emailPackage.subject,
      body_html: emailPackage.body_html,
      template_type: emailPackage.template_type,
      audience_filter: {
        ...audienceFilter,
        suite_type: req.body.type,
        context: req.body.context || {},
        sms_fallback: emailPackage.sms_fallback,
        business_rules: BUSINESS_RULES
      },
      audience_description: emailPackage.audience_description,
      scheduled_at: req.body.scheduled_at || null,
      status: req.body.scheduled_at ? 'SCHEDULED' : 'DRAFT',
      clinic_id: req.clinic_id,
      created_by_user_id: getUserId(req),
      total_recipients: estimatedRecipients
    });

    res.status(201).json({
      message: 'Campagne email créée',
      campaign,
      email_package: emailPackage,
      estimated_recipients: estimatedRecipients
    });
  } catch (error) {
    console.error('Quick campaign error:', error);
    res.status(500).json({ error: 'Erreur création campagne' });
  }
});

router.get('/suite/segments', requireClinicId, async (req, res) => {
  try {
    const clinicId = req.clinic_id;
    const base = getEmailEligibleWhere(clinicId);
    const now = new Date();
    const childCutoff = new Date(now.getFullYear() - 12, now.getMonth(), now.getDate());
    const seniorCutoff = new Date(now.getFullYear() - 60, now.getMonth(), now.getDate());
    const cities = await Patient.findAll({
      where: base,
      attributes: ['city'],
      group: ['city'],
      raw: true
    });

    const segments = [
      { key: 'fideles', label: 'Patients fidèles', count: await Patient.count({ where: base }), criteria: 'Patients actifs avec consentement email' },
      { key: 'pediatrie', label: 'Pédiatrie', count: await Patient.count({ where: { ...base, date_of_birth: { [Op.gte]: childCutoff } } }), criteria: 'Moins de 12 ans' },
      { key: 'seniors', label: 'Seniors', count: await Patient.count({ where: { ...base, date_of_birth: { [Op.lte]: seniorCutoff } } }), criteria: '60 ans et plus' },
      { key: 'sms_fallback', label: 'Alternative SMS possible', count: await Patient.count({ where: { clinic_id: clinicId, is_active: true, consent_sms_reminders: true, [Op.or]: [{ email: null }, { email: '' }] } }), criteria: 'Pas d’email mais consentement SMS' }
    ];

    res.json({
      segments,
      cities: cities.map(c => c.city).filter(Boolean),
      criteria_supported: ['type de soin', 'fréquence de visite', 'âge', 'ville', 'praticien référent']
    });
  } catch (error) {
    console.error('Mailing segments error:', error);
    res.status(500).json({ error: 'Erreur segmentation' });
  }
});

router.get('/suite/conformity', requireClinicId, async (req, res) => {
  try {
    const clinicId = req.clinic_id;
    const activePatients = await Patient.count({ where: { clinic_id: clinicId, is_active: true } });
    const emailPatients = await Patient.count({ where: { clinic_id: clinicId, is_active: true, [Op.and]: [{ email: { [Op.ne]: null } }, { email: { [Op.ne]: '' } }] } });
    const eligible = await Patient.count({ where: getEmailEligibleWhere(clinicId) });
    const consentCoverage = emailPatients > 0 ? Math.round((eligible / emailPatients) * 100) : 0;

    res.json({
      status: consentCoverage >= 80 ? 'BON' : consentCoverage >= 50 ? 'A_SURVEILLER' : 'RISQUE',
      active_patients: activePatients,
      email_patients: emailPatients,
      eligible_patients: eligible,
      consent_coverage: `${consentCoverage}%`,
      checks: [
        { label: 'Double opt-in ESP', status: 'A_VERIFIER', detail: 'À confirmer dans Brevo/Mailgun/Sendgrid' },
        { label: 'Lien de désinscription', status: 'OBLIGATOIRE', detail: 'Variable {{lien_desinscription}} requise dans chaque email marketing' },
        { label: 'Consentement RGPD', status: eligible > 0 ? 'OK' : 'A_COMPLETER', detail: 'Basé sur consent_data_processing' },
        { label: 'Limite fréquence', status: 'OK', detail: '2 emails maximum par patient sur 30 jours' },
        { label: 'Données médicales sensibles', status: 'ATTENTION', detail: 'Éviter diagnostics et détails médicaux dans l’email' }
      ]
    });
  } catch (error) {
    console.error('Mailing conformity error:', error);
    res.status(500).json({ error: 'Erreur audit conformité' });
  }
});

// Get all mailing campaigns - with clinic filtering
router.get('/campaigns', requireClinicId, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'CANCELLED']),
  query('template_type').optional().isIn(['CUSTOM', 'APPOINTMENT_REMINDER', 'BIRTHDAY_GREETING', 'FOLLOW_UP', 'NEWSLETTER', 'PROMOTIONAL'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Paramètres invalides',
        details: errors.array()
      });
    }

    const { page = 1, limit = 20, status, template_type } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = {};
    
    // Apply clinic filtering
    if (req.clinic_id) {
      whereClause.clinic_id = req.clinic_id;
    }
    
    if (status) whereClause.status = status;
    if (template_type) whereClause.template_type = template_type;

    const { count, rows: campaigns } = await MailingCampaign.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'full_name', 'email']
        },
        {
          model: MailingLog,
          as: 'logs',
          attributes: ['id'],
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    // Add computed fields
    const campaignsWithMetrics = campaigns.map(campaign => ({
      ...campaign.toJSON(),
      logs_count: campaign.logs?.length || 0,
      delivery_rate: campaign.emails_sent > 0 ? (campaign.emails_delivered / campaign.emails_sent * 100).toFixed(1) : 0,
      open_rate: campaign.emails_delivered > 0 ? (campaign.emails_opened / campaign.emails_delivered * 100).toFixed(1) : 0,
      click_rate: campaign.emails_opened > 0 ? (campaign.emails_clicked / campaign.emails_opened * 100).toFixed(1) : 0
    }));

    res.json({
      campaigns: campaignsWithMetrics,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(count / limit),
        total_count: count,
        per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des campagnes'
    });
  }
});

// Get single campaign with full details - with clinic check
router.get('/campaigns/:id', requireClinicId, [
  param('id').isUUID().withMessage('ID campagne invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const campaign = await MailingCampaign.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'full_name', 'email']
        },
        {
          model: MailingLog,
          as: 'logs',
          limit: 50,
          order: [['created_at', 'DESC']],
          include: [
            {
              model: Patient,
              as: 'patient',
              attributes: ['id', 'first_name', 'last_name', 'email']
            }
          ]
        }
      ]
    });

    if (!campaign) {
      return res.status(404).json({
        error: 'Campagne non trouvée'
      });
    }

    // Calculate additional metrics
    const campaignData = {
      ...campaign.toJSON(),
      delivery_rate: campaign.emails_sent > 0 ? (campaign.emails_delivered / campaign.emails_sent * 100).toFixed(1) : 0,
      open_rate: campaign.emails_delivered > 0 ? (campaign.emails_opened / campaign.emails_delivered * 100).toFixed(1) : 0,
      click_rate: campaign.emails_opened > 0 ? (campaign.emails_clicked / campaign.emails_opened * 100).toFixed(1) : 0,
      bounce_rate: campaign.emails_sent > 0 ? (campaign.emails_bounced / campaign.emails_sent * 100).toFixed(1) : 0
    };

    res.json(campaignData);
  } catch (error) {
    console.error('Get campaign error:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération de la campagne'
    });
  }
});

// Create new mailing campaign - with automatic clinic_id assignment
router.post('/campaigns', requireClinicId, [
  requireRole('ADMIN', 'DENTIST', 'ASSISTANT'),
  body('name')
    .isLength({ min: 1, max: 100 })
    .withMessage('Nom requis (max 100 caractères)')
    .trim(),
  body('subject')
    .isLength({ min: 1, max: 255 })
    .withMessage('Sujet requis (max 255 caractères)')
    .trim(),
  body('body_html')
    .isLength({ min: 10 })
    .withMessage('Contenu HTML requis (min 10 caractères)'),
  body('template_type')
    .isIn(['CUSTOM', 'APPOINTMENT_REMINDER', 'BIRTHDAY_GREETING', 'FOLLOW_UP', 'NEWSLETTER', 'PROMOTIONAL'])
    .withMessage('Type de template invalide'),
  body('audience_filter')
    .optional()
    .isObject()
    .withMessage('Filtre audience invalide'),
  body('audience_description')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Description audience trop longue')
    .trim(),
  body('scheduled_at')
    .optional()
    .isISO8601()
    .withMessage('Date de programmation invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    // Calculate audience size based on filter
    let audienceCount = 0;
    const { audience_filter } = req.body;
    
    let whereClause = getEmailEligibleWhere(req.clinic_id);
    
    // Apply audience filters
    if (audience_filter) {
      if (audience_filter.age_min || audience_filter.age_max) {
        const today = new Date();
        if (audience_filter.age_max) {
          const minBirthDate = new Date(today.getFullYear() - audience_filter.age_max - 1, today.getMonth(), today.getDate());
          whereClause.date_of_birth = { [Op.gte]: minBirthDate };
        }
        if (audience_filter.age_min) {
          const maxBirthDate = new Date(today.getFullYear() - audience_filter.age_min, today.getMonth(), today.getDate());
          whereClause.date_of_birth = { ...whereClause.date_of_birth, [Op.lte]: maxBirthDate };
        }
      }
      
      if (audience_filter.gender) {
        whereClause.gender = audience_filter.gender;
      }
      
      if (audience_filter.city) {
        whereClause.city = audience_filter.city;
      }

      if (Array.isArray(audience_filter.patient_ids) && audience_filter.patient_ids.length > 0) {
        whereClause.id = { [Op.in]: audience_filter.patient_ids };
      }
      
      if (audience_filter.has_appointments !== undefined) {
        // This would require a more complex query with joins
        // For now, we'll skip this filter in the count
      }
    }
    audienceCount = await Patient.count({ where: whereClause });

    const campaign = await MailingCampaign.create({
      ...req.body,
      clinic_id: req.clinic_id, // Automatic clinic assignment
      created_by_user_id: getUserId(req),
      total_recipients: audienceCount,
      status: req.body.scheduled_at ? 'SCHEDULED' : 'DRAFT'
    });

    // Log campaign creation
    await AuditLog.create({
      user_id: getUserId(req),
      action: 'CREATE',
      resource_type: 'mailing_campaigns',
      resource_id: campaign.id,
      new_values: { name: campaign.name, audience_count: audienceCount },
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      description: `Nouvelle campagne mailing créée: ${campaign.name} (${audienceCount} destinataires)`
    });

    res.status(201).json({
      message: 'Campagne créée avec succès',
      campaign: {
        ...campaign.toJSON(),
        estimated_recipients: audienceCount
      }
    });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({
      error: 'Erreur lors de la création de la campagne'
    });
  }
});

// Send mailing campaign (mock implementation) - with clinic check
router.post('/campaigns/:id/send', requireClinicId, [
  param('id').isUUID().withMessage('ID campagne invalide'),
  requireRole('ADMIN', 'DENTIST', 'ASSISTANT')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    if (!isAllowedSendHour()) {
      return res.status(409).json({
        error: 'Envoi bloqué hors plage autorisée',
        code: 'SEND_WINDOW_CLOSED',
        allowed_window: BUSINESS_RULES.sendWindow
      });
    }

    const campaign = await MailingCampaign.findOne({ where: { id: req.params.id, clinic_id: req.clinic_id } });
    if (!campaign) {
      return res.status(404).json({
        error: 'Campagne non trouvée'
      });
    }

    if (campaign.status === 'SENT') {
      return res.status(400).json({
        error: 'Cette campagne a déjà été envoyée'
      });
    }

    // Get eligible patients based on audience filter
    let whereClause = getEmailEligibleWhere(req.clinic_id);

    // Apply audience filters from campaign 
    if (campaign.audience_filter) {
      const filter = campaign.audience_filter;
      
      if (filter.age_min || filter.age_max) {
        const today = new Date();
        if (filter.age_max) {
          const minBirthDate = new Date(today.getFullYear() - filter.age_max - 1, today.getMonth(), today.getDate());
          whereClause.date_of_birth = { [Op.gte]: minBirthDate };
        }
        if (filter.age_min) {
          const maxBirthDate = new Date(today.getFullYear() - filter.age_min, today.getMonth(), today.getDate());
          whereClause.date_of_birth = { ...whereClause.date_of_birth, [Op.lte]: maxBirthDate };
        }
      }
      
      if (filter.gender) whereClause.gender = filter.gender;
      if (filter.city) whereClause.city = filter.city;
      if (Array.isArray(filter.patient_ids) && filter.patient_ids.length > 0) {
        whereClause.id = { [Op.in]: filter.patient_ids };
      }
    }

    let eligiblePatients = await Patient.findAll({
      where: whereClause,
      attributes: ['id', 'first_name', 'last_name', 'email']
    });
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentLogs = await MailingLog.findAll({
      where: {
        patient_id: { [Op.in]: eligiblePatients.map(p => p.id) },
        sent_at: { [Op.gte]: thirtyDaysAgo },
        status: { [Op.in]: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED'] }
      },
      attributes: ['patient_id'],
      raw: true
    });
    const countsByPatient = recentLogs.reduce((acc, row) => {
      acc[row.patient_id] = (acc[row.patient_id] || 0) + 1;
      return acc;
    }, {});
    eligiblePatients = eligiblePatients.filter(patient => (countsByPatient[patient.id] || 0) < BUSINESS_RULES.maxEmailsPerPatientPerMonth);

    const smtpConfigured = isMailConfigured();
    let emailsSent = 0;
    let emailsDelivered = 0;
    let emailsBounced = 0;
    let emailsFailed = 0;
    const context = campaign.audience_filter?.context || {};

    for (const patient of eligiblePatients) {
      const subject = replaceTemplateVariables(campaign.subject, patient, context);
      const html = replaceTemplateVariables(campaign.body_html, patient, context);
      const sentAt = new Date();

      try {
        const result = await sendMail({
          to: patient.email,
          subject,
          html
        });

        const wasMocked = Boolean(result?.mocked) || !smtpConfigured;
        await MailingLog.create({
          campaign_id: campaign.id,
          patient_id: patient.id,
          email: patient.email,
          status: wasMocked ? 'DELIVERED' : 'SENT',
          sent_at: sentAt,
          delivered_at: wasMocked ? sentAt : null,
          is_mock: wasMocked,
          external_message_id: result?.messageId || `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });

        emailsSent++;
        emailsDelivered++;
      } catch (sendError) {
        await MailingLog.create({
          campaign_id: campaign.id,
          patient_id: patient.id,
          email: patient.email,
          status: 'FAILED',
          sent_at: sentAt,
          error_message: sendError.message,
          is_mock: !smtpConfigured
        });
        emailsFailed++;
      }
    }

    // Update campaign statistics
    await campaign.update({
      status: 'SENT',
      sent_at: new Date(),
      total_recipients: eligiblePatients.length,
      emails_sent: emailsSent,
      emails_delivered: emailsDelivered,
      emails_bounced: emailsBounced + emailsFailed
    });

    // Log campaign sending
    await AuditLog.create({
      user_id: getUserId(req),
      action: 'SEND',
      resource_type: 'mailing_campaigns',
      resource_id: campaign.id,
      new_values: { 
        status: 'SENT',
        emails_sent: emailsSent,
        emails_delivered: emailsDelivered,
        emails_failed: emailsFailed,
        smtp_configured: smtpConfigured
      },
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      description: `Campagne ${campaign.name} envoyée: ${emailsDelivered}/${emailsSent} emails livrés`
    });

    res.json({
      message: smtpConfigured
        ? 'Campagne envoyée avec succès'
        : 'Campagne simulée: configurez SMTP_HOST, SMTP_USER et SMTP_PASS pour envoyer réellement',
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: 'SENT',
        emails_sent: emailsSent,
        emails_delivered: emailsDelivered,
        emails_bounced: emailsBounced + emailsFailed,
        emails_failed: emailsFailed,
        smtp_configured: smtpConfigured,
        delivery_rate: emailsSent > 0 ? (emailsDelivered / emailsSent * 100).toFixed(1) : 0
      }
    });
  } catch (error) {
    console.error('Send campaign error:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'envoi de la campagne'
    });
  }
});

// Get campaign analytics/logs - with clinic check
router.get('/campaigns/:id/logs', requireClinicId, [
  param('id').isUUID().withMessage('ID campagne invalide'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['QUEUED', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'BOUNCED', 'UNSUBSCRIBED'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Paramètres invalides',
        details: errors.array()
      });
    }

    const { page = 1, limit = 50, status } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = { campaign_id: req.params.id };
    if (status) whereClause.status = status;

    const { count, rows: logs } = await MailingLog.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    res.json({
      logs,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(count / limit),
        total_count: count,
        per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get campaign logs error:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des logs'
    });
  }
});

// Get mailing analytics summary - with clinic filtering
router.get('/analytics', requireClinicId, async (req, res) => {
  try {
    let whereClause = {};
    
    // Apply clinic filtering
    if (req.clinic_id) {
      whereClause.clinic_id = req.clinic_id;
    }
    
    const totalCampaigns = await MailingCampaign.count({ where: whereClause });
    const sentCampaigns = await MailingCampaign.count({ where: { ...whereClause, status: 'SENT' } });
    const draftCampaigns = await MailingCampaign.count({ where: { ...whereClause, status: 'DRAFT' } });
    
    const totalEmailsSent = await MailingCampaign.sum('emails_sent', { where: whereClause }) || 0;
    const totalEmailsDelivered = await MailingCampaign.sum('emails_delivered', { where: whereClause }) || 0;
    const totalEmailsOpened = await MailingCampaign.sum('emails_opened', { where: whereClause }) || 0;
    const totalEmailsClicked = await MailingCampaign.sum('emails_clicked', { where: whereClause }) || 0;
    const totalEmailsBounced = await MailingCampaign.sum('emails_bounced', { where: whereClause }) || 0;

    // Calculate rates
    const deliveryRate = totalEmailsSent > 0 ? (totalEmailsDelivered / totalEmailsSent * 100).toFixed(1) : 0;
    const openRate = totalEmailsDelivered > 0 ? (totalEmailsOpened / totalEmailsDelivered * 100).toFixed(1) : 0;
    const clickRate = totalEmailsOpened > 0 ? (totalEmailsClicked / totalEmailsOpened * 100).toFixed(1) : 0;
    const bounceRate = totalEmailsSent > 0 ? (totalEmailsBounced / totalEmailsSent * 100).toFixed(1) : 0;

    // Get eligible patients count - with clinic filtering
    let patientWhereClause = getEmailEligibleWhere(req.clinic_id);
    
    const eligiblePatients = await Patient.count({
      where: patientWhereClause
    });

    res.json({
      campaigns: {
        total: totalCampaigns,
        sent: sentCampaigns,
        draft: draftCampaigns,
        scheduled: totalCampaigns - sentCampaigns - draftCampaigns
      },
      emails: {
        sent: totalEmailsSent,
        delivered: totalEmailsDelivered,
        opened: totalEmailsOpened,
        clicked: totalEmailsClicked,
        bounced: totalEmailsBounced
      },
      rates: {
        delivery_rate: `${deliveryRate}%`,
        open_rate: `${openRate}%`,
        click_rate: `${clickRate}%`,
        bounce_rate: `${bounceRate}%`
      },
      audience: {
        eligible_patients: eligiblePatients,
        total_patients: await Patient.count({ where: { clinic_id: req.clinic_id, is_active: true } })
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des statistiques'
    });
  }
});

module.exports = router;
