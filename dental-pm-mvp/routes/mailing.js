const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { MailingCampaign, MailingLog, Patient, User, AuditLog } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// =============================================================================
// MAILING CAMPAIGNS MANAGEMENT
// =============================================================================

// Get all mailing campaigns
router.get('/campaigns', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['DRAFT', 'SCHEDULED', 'SENT']),
  query('template_type').optional().isIn(['CUSTOM', 'APPOINTMENT_REMINDER', 'FOLLOW_UP', 'BIRTHDAY', 'NEWSLETTER', 'PROMOTIONAL'])
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

// Get single campaign with full details
router.get('/campaigns/:id', [
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

// Create new mailing campaign
router.post('/campaigns', [
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
    .isIn(['CUSTOM', 'APPOINTMENT_REMINDER', 'FOLLOW_UP', 'BIRTHDAY', 'NEWSLETTER', 'PROMOTIONAL'])
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
    
    let whereClause = { 
      is_active: true,
      email: { [Op.ne]: null },
      email: { [Op.ne]: '' }
    };
    
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
      
      if (audience_filter.has_appointments !== undefined) {
        // This would require a more complex query with joins
        // For now, we'll skip this filter in the count
      }
    }

    // Check for opt-out patients (respect consent_sms_reminders as email opt-out for now)
    whereClause.consent_sms_reminders = true;

    audienceCount = await Patient.count({ where: whereClause });

    const campaign = await MailingCampaign.create({
      ...req.body,
      created_by_user_id: req.user.id,
      total_recipients: audienceCount,
      status: req.body.scheduled_at ? 'SCHEDULED' : 'DRAFT'
    });

    // Log campaign creation
    await AuditLog.create({
      user_id: req.user.id,
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

// Send mailing campaign (mock implementation)
router.post('/campaigns/:id/send', [
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

    const campaign = await MailingCampaign.findByPk(req.params.id);
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
    let whereClause = { 
      is_active: true,
      email: { [Op.ne]: null },
      email: { [Op.ne]: '' },
      consent_sms_reminders: true // Using this as email consent for now
    };

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
    }

    const eligiblePatients = await Patient.findAll({
      where: whereClause,
      attributes: ['id', 'first_name', 'last_name', 'email']
    });

    // Mock email sending process
    let emailsSent = 0;
    let emailsDelivered = 0;
    let emailsBounced = 0;

    for (const patient of eligiblePatients) {
      // Mock delivery success rate (90% success)
      const isDelivered = Math.random() < 0.9;
      const deliveredAt = isDelivered ? new Date() : null;
      const bouncedAt = isDelivered ? null : new Date();

      // Create mailing log
      await MailingLog.create({
        campaign_id: campaign.id,
        patient_id: patient.id,
        email: patient.email,
        status: isDelivered ? 'DELIVERED' : 'BOUNCED',
        sent_at: new Date(),
        delivered_at: deliveredAt,
        bounced_at: bouncedAt,
        is_mock: true,
        external_message_id: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });

      emailsSent++;
      if (isDelivered) {
        emailsDelivered++;
      } else {
        emailsBounced++;
      }

      // Simulate some delay
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Update campaign statistics
    await campaign.update({
      status: 'SENT',
      sent_at: new Date(),
      total_recipients: eligiblePatients.length,
      emails_sent: emailsSent,
      emails_delivered: emailsDelivered,
      emails_bounced: emailsBounced
    });

    // Log campaign sending
    await AuditLog.create({
      user_id: req.user.id,
      action: 'SEND',
      resource_type: 'mailing_campaigns',
      resource_id: campaign.id,
      new_values: { 
        status: 'SENT',
        emails_sent: emailsSent,
        emails_delivered: emailsDelivered 
      },
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      description: `Campagne ${campaign.name} envoyée: ${emailsDelivered}/${emailsSent} emails livrés`
    });

    res.json({
      message: process.env.MOCK_EMAIL_ENABLED === 'true' 
        ? 'Campagne simulée envoyée avec succès'
        : 'Campagne envoyée avec succès',
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: 'SENT',
        emails_sent: emailsSent,
        emails_delivered: emailsDelivered,
        emails_bounced: emailsBounced,
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

// Get campaign analytics/logs
router.get('/campaigns/:id/logs', [
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

// Get mailing analytics summary
router.get('/analytics', async (req, res) => {
  try {
    const totalCampaigns = await MailingCampaign.count();
    const sentCampaigns = await MailingCampaign.count({ where: { status: 'SENT' } });
    const draftCampaigns = await MailingCampaign.count({ where: { status: 'DRAFT' } });
    
    const totalEmailsSent = await MailingCampaign.sum('emails_sent') || 0;
    const totalEmailsDelivered = await MailingCampaign.sum('emails_delivered') || 0;
    const totalEmailsOpened = await MailingCampaign.sum('emails_opened') || 0;
    const totalEmailsClicked = await MailingCampaign.sum('emails_clicked') || 0;
    const totalEmailsBounced = await MailingCampaign.sum('emails_bounced') || 0;

    // Calculate rates
    const deliveryRate = totalEmailsSent > 0 ? (totalEmailsDelivered / totalEmailsSent * 100).toFixed(1) : 0;
    const openRate = totalEmailsDelivered > 0 ? (totalEmailsOpened / totalEmailsDelivered * 100).toFixed(1) : 0;
    const clickRate = totalEmailsOpened > 0 ? (totalEmailsClicked / totalEmailsOpened * 100).toFixed(1) : 0;
    const bounceRate = totalEmailsSent > 0 ? (totalEmailsBounced / totalEmailsSent * 100).toFixed(1) : 0;

    // Get eligible patients count
    const eligiblePatients = await Patient.count({
      where: {
        is_active: true,
        email: { [Op.ne]: null },
        email: { [Op.ne]: '' },
        consent_sms_reminders: true
      }
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
        total_patients: await Patient.count({ where: { is_active: true } })
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