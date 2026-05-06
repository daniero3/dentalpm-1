const express = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const rateLimit   = require('express-rate-limit');
const compression = require('compression');
const crypto      = require('crypto');
require('dotenv').config();

const sequelize = require('./database/connection');

const authRoutes          = require('./routes/auth');
const patientRoutes       = require('./routes/patients');
const appointmentRoutes   = require('./routes/appointments');
const invoiceRoutes       = require('./routes/invoices');
const quoteRoutes         = require('./routes/quotes');
const integrationRoutes   = require('./routes/integrations');
const dashboardRoutes     = require('./routes/dashboard');
const inventoryRoutes     = require('./routes/inventory');
const supplierRoutes      = require('./routes/suppliers');
const labRoutes           = require('./routes/labs');
const mailingRoutes       = require('./routes/mailing');
const mediaRoutes         = require('./routes/media');
const subscriptionsRoutes = require('./routes/subscriptions');
const billingRoutes       = require('./routes/billing');
const adminRoutes         = require('./routes/admin');
const legalRoutes         = require('./routes/legal');
const pricingRoutes       = require('./routes/pricing');
const documentRoutes      = require('./routes/documents');
const prescriptionRoutes  = require('./routes/prescriptions');
const odontogramRoutes    = require('./routes/odontogram');
const reportsRoutes       = require('./routes/reports');
const messagingRoutes     = require('./routes/messaging');
const purchasesRoutes     = require('./routes/purchases');
const onboardingRoutes    = require('./routes/onboarding');
const dentalChartRoutes   = require('./routes/dental-chart');

const { getSubscriptionStatus } = require('./middleware/licensing');
const { authenticateToken: requireAuth, requireClinicScope, requireSuperAdmin, blockSuperAdminFromMedicalData: blockMedical } = require('./middleware/auth');
const { requireModuleAccess } = require('./utils/permissions');

const app  = express();
const PORT = process.env.PORT || 8001;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const REQUIRE_HTTPS = process.env.REQUIRE_HTTPS === 'true' || IS_PRODUCTION;
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:8001',
  'https://dentalpracticemada.com',
  'https://www.dentalpracticemada.com',
  process.env.FRONTEND_URL,
].filter(Boolean);
const ENABLE_TEST_ACCOUNTS = process.env.ENABLE_TEST_ACCOUNTS === 'true';

const TEST_ACCOUNTS = [
  { username:'test_essential', email:'essential@dentalpm-test.mg', password:'DentalPM2026!', full_name:'Admin Essential', role:'ADMIN', plan:'ESSENTIAL', clinicName:'Cabinet Test ESSENTIAL', phone:'034 00 000 01' },
  { username:'test_pro',       email:'pro@dentalpm-test.mg',       password:'DentalPM2026!', full_name:'Admin Pro',        role:'ADMIN', plan:'PRO',       clinicName:'Cabinet Test PRO',       phone:'034 00 000 02' },
  { username:'test_group',     email:'group@dentalpm-test.mg',     password:'DentalPM2026!', full_name:'Admin Group',      role:'ADMIN', plan:'GROUP',     clinicName:'Cabinet Test GROUP',     phone:'034 00 000 03' },
];
const PLAN_PRICES = { ESSENTIAL:149000, PRO:199000, GROUP:299000 };
const PLAN_USERS  = { ESSENTIAL:2, PRO:5, GROUP:50 };

async function seedTestAccounts() {
  const { User, Clinic, Subscription } = require('./models');
  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 1);

  for (const acc of TEST_ACCOUNTS) {
    let clinic = await Clinic.findOne({ where: { email: acc.email } }).catch(() => null);
    if (!clinic) {
      clinic = await Clinic.create({
        name: acc.clinicName,
        email: acc.email,
        phone: acc.phone,
        address: 'Antananarivo, Madagascar',
        city: 'Antananarivo',
        subscription_status: 'ACTIVE',
        current_plan: acc.plan,
        is_active: true,
        is_verified: true,
        onboarding_completed: true,
        max_users: PLAN_USERS[acc.plan],
      }).catch(() => null);
    } else {
      await clinic.update({ subscription_status: 'ACTIVE', current_plan: acc.plan }).catch(() => {});
    }
    if (!clinic) continue;

    const existing = await User.findOne({ where: { username: acc.username } }).catch(() => null);
    if (!existing) {
      await User.create({
        username: acc.username,
        email: acc.email,
        password_hash: acc.password,
        full_name: acc.full_name,
        role: acc.role,
        clinic_id: clinic.id,
        is_active: true,
        is_verified: true,
        onboarding_completed: true,
      }).catch(() => {});
    } else {
      await existing.update({ clinic_id: clinic.id, is_active: true }).catch(() => {});
    }

    const [updatedSubs] = await Subscription.update(
      {
        plan: acc.plan,
        status: 'ACTIVE',
        end_date: endDate,
        monthly_price_mga: PLAN_PRICES[acc.plan],
        annual_price_mga: PLAN_PRICES[acc.plan] * 12,
        price_mga: PLAN_PRICES[acc.plan],
        max_practitioners: PLAN_USERS[acc.plan],
      },
      { where: { clinic_id: clinic.id } }
    ).catch(() => [0]);

    if (!updatedSubs) {
      await Subscription.create({
        clinic_id: clinic.id,
        plan: acc.plan,
        status: 'ACTIVE',
        billing_cycle: 'ANNUAL',
        start_date: new Date(),
        end_date: endDate,
        price_mga: PLAN_PRICES[acc.plan],
        monthly_price_mga: PLAN_PRICES[acc.plan],
        annual_price_mga: PLAN_PRICES[acc.plan] * 12,
        max_practitioners: PLAN_USERS[acc.plan],
      }).catch(() => {});
    }
  }
}

// ✅ CORS inconditionnel — tout premier middleware
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use((req, res, next) => {
  const requestId = req.get('X-Request-Id') || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
});
app.use((req, res, next) => {
  if (!REQUIRE_HTTPS || req.secure || req.get('x-forwarded-proto') === 'https') {
    return next();
  }

  if (['GET', 'HEAD'].includes(req.method)) {
    return res.redirect(308, `https://${req.get('host')}${req.originalUrl}`);
  }

  return res.status(426).json({
    error: 'Connexion HTTPS requise',
    code: 'HTTPS_REQUIRED',
    request_id: req.requestId
  });
});
app.use(helmet({
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS','PATCH'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With','Accept'],
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(rateLimit({ windowMs: 15*60*1000, max: 500, skip: r => r.path === '/api/health' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb', parameterLimit: 100 }));
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');

  const originalJson = res.json.bind(res);
  res.json = (payload) => {
    if (IS_PRODUCTION && res.statusCode >= 500 && payload && typeof payload === 'object') {
      return originalJson({
        error: payload.error || 'Erreur serveur',
        code: payload.code || 'INTERNAL_SERVER_ERROR',
        request_id: req.requestId
      });
    }

    if (payload && typeof payload === 'object' && req.requestId && !payload.request_id) {
      payload.request_id = req.requestId;
    }

    return originalJson(payload);
  };

  next();
});
app.use('/uploads', express.static('uploads'));

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status:'OK', timestamp: new Date().toISOString(), service:'DentalPM Madagascar' });
});

// ── Middleware global clinic_id — après auth, avant routes ────────────────────
// Résout req.clinic_id depuis le token JWT ou la DB
app.use('/api', (req, res, next) => {
  if (req.user && !req.clinic_id) {
    req.clinic_id = req.user.clinic_id
      || req.user.dataValues?.clinic_id
      || null;
  }
  next();
});


// ── Debug token (temporaire) ─────────────────────────────────────────────────
app.get('/api/check-token', require('./middleware/auth').authenticateToken, async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Route non trouvée' });
  }
  const { User } = require('./models');
  const userId = req.user?.id || req.user?.dataValues?.id;
  let dbClinicId = null;
  try {
    const u = await User.findByPk(userId, { attributes: ['clinic_id','role'] });
    dbClinicId = u?.clinic_id;
  } catch(e) {}
  res.json({
    user_id:      userId,
    role:         req.user?.role,
    token_clinic: req.clinic_id || req.user?.clinic_id || null,
    db_clinic:    dbClinicId,
    ok:           !!(req.clinic_id || req.user?.clinic_id || dbClinicId)
  });
});


// ── Cache headers pour assets statiques ──────────────────────────────────────
app.use('/static', (req, res, next) => {
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // 1 an
  next();
});

// ── Routes ── Structure IDENTIQUE à l'originale ───────────────────────────────
// (requireAuth uniquement là où il était dans l'original)
app.use('/api/auth',             authRoutes);
app.use('/api/patients',         requireAuth, requireClinicScope, blockMedical, requireModuleAccess('patients'), patientRoutes);
app.use('/api/appointments',     requireAuth, requireClinicScope, blockMedical, requireModuleAccess('appointments'), appointmentRoutes);
app.use('/api/invoices',         requireAuth, requireClinicScope, blockMedical, requireModuleAccess('invoices'), invoiceRoutes);
app.use('/api/quotes',           requireAuth, requireClinicScope, blockMedical, requireModuleAccess('quotes'), quoteRoutes);
app.use('/api/integrations',     integrationRoutes);
app.use('/api/dashboard',        requireAuth, requireClinicScope, blockMedical, dashboardRoutes);
app.use('/api/inventory',        requireAuth, requireClinicScope, blockMedical, requireModuleAccess('inventory'), inventoryRoutes);
app.use('/api/suppliers',        requireAuth, requireClinicScope, blockMedical, requireModuleAccess('suppliers'), supplierRoutes);
app.use('/api/labs',             requireAuth, requireClinicScope, blockMedical, requireModuleAccess('lab_orders'), labRoutes);
app.use('/api/mailing',          requireAuth, requireClinicScope, blockMedical, requireModuleAccess('messaging'), mailingRoutes);
app.use('/api/media',            requireAuth, mediaRoutes);
app.use('/api/subscriptions',    requireAuth, subscriptionsRoutes);
// Webhooks de paiement — SANS auth (appelés par MVola/Orange depuis l'extérieur)

// ── Public checkout Stripe — sans authentification (inscription cabinet) ───────
app.post('/api/billing/public-checkout', async (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(503).json({ error: 'Paiement Stripe non configuré' });
    }
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const { plan_code, clinic_id, email } = req.body;

    const STRIPE_PRICE_IDS = {
      ESSENTIAL: 'price_1TM2Yr4zCGinpjiEssURjhxa',
      PRO:       'price_1TM2Ct4zCGinpjiEQ9KqgVdN',
      GROUP:     'price_1TM2m34zCGinpjiEOo3nR5CQ',
    };

    const priceId = STRIPE_PRICE_IDS[plan_code];
    if (!priceId) return res.status(400).json({ error: 'Plan invalide (ESSENTIAL, PRO ou GROUP)' });

    const FRONT = process.env.FRONTEND_URL || 'https://dentalpracticemada.com';

    const sessionData = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 7,
        metadata: { plan: plan_code, clinic_id: clinic_id || '' }
      },
      metadata: { plan: plan_code, clinic_id: clinic_id || '' },
      success_url: FRONT + '/login?checkout=success&plan=' + plan_code,
      cancel_url:  FRONT + '/register?checkout=cancelled',
      locale: 'fr',
    };
    if (email) sessionData.customer_email = email;

    const session = await stripe.checkout.sessions.create(sessionData);
    res.json({ url: session.url, session_id: session.id });
  } catch (error) {
    console.error('Public checkout error:', error.message);
    res.status(500).json({ error: 'Erreur Stripe', details: error.message });
  }
});

app.use('/api/billing/webhook/stripe', billingRoutes); // raw body pour vérification signature Stripe
app.use('/api/billing/webhook',    billingRoutes);
app.use('/api/billing',          requireAuth, billingRoutes);
app.use('/api/admin',            requireAuth, requireSuperAdmin, adminRoutes);
app.use('/api/legal',            legalRoutes);
app.use('/api/pricing-schedules',requireAuth, requireClinicScope, pricingRoutes);
app.use('/api/procedure-fees',   requireAuth, requireClinicScope, pricingRoutes);
app.use('/api/documents',        requireAuth, requireClinicScope, blockMedical, requireModuleAccess('patient_documents'), documentRoutes);
app.use('/api/prescriptions',    requireAuth, requireClinicScope, blockMedical, requireModuleAccess('prescriptions'), prescriptionRoutes);
app.use('/api/reports',          requireAuth, requireClinicScope, blockMedical, requireModuleAccess('reports'), reportsRoutes);
app.use('/api/messaging',        requireAuth, requireClinicScope, blockMedical, requireModuleAccess('messaging'), messagingRoutes);
app.use('/api/purchases',        requireAuth, requireClinicScope, blockMedical, requireModuleAccess('purchases'), purchasesRoutes);
app.use('/api/onboarding',       requireAuth, onboardingRoutes);

// Routes avec chemins relatifs (montées sur /api)
app.use('/api', requireAuth, requireClinicScope, blockMedical, requireModuleAccess('prescriptions'), prescriptionRoutes);
app.use('/api', requireAuth, requireClinicScope, blockMedical, requireModuleAccess('dental_chart'), odontogramRoutes);
app.use('/api', requireAuth, requireClinicScope, blockMedical, requireModuleAccess('dental_chart'), dentalChartRoutes);

app.get('/api/subscription/status', requireAuth, getSubscriptionStatus);


// ── Endpoint de version — vérifier le déploiement ────────────────────────────
app.get('/api/version', (req, res) => {
  res.json({
    version: '2.0.0',
    deployed_at: '2026-04-17 06:33',
    commit: '4c32395',
    features: ['clinic_isolation','stripe_only','super_admin_only','trial_dynamic_plan']
  });
});

// ── Error handlers ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(JSON.stringify({
    level: 'error',
    request_id: req.requestId,
    method: req.method,
    path: req.originalUrl,
    status: err.status || 500,
    message: err.message
  }));
  res.status(err.status || 500).json({
    error: IS_PRODUCTION ? 'Erreur interne' : (err.message || 'Erreur interne'),
    code: 'UNHANDLED_ERROR',
    request_id: req.requestId
  });
});

app.use('*', (req, res) => {
  res.status(404).json({ error:'Route non trouvée', path: req.originalUrl, request_id: req.requestId });
});

// ── Start ─────────────────────────────────────────────────────────────────────
async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion à PostgreSQL réussie');
    // Exécuter migrations au démarrage
    (async () => {
      try {
        const { Sequelize } = require('sequelize');
        const { sequelize } = require('./models');
        const qi = sequelize.getQueryInterface();
        await require('./migrations/20260418-stripe-subscription-id').up(qi, Sequelize).catch(() => {});
        await require('./migrations/20260424-performance-indexes').up(qi, Sequelize).catch(() => {});
        console.log('✅ Migrations & index DB OK');
      } catch (e) {
        console.log('Migration (non-fatal):', e.message);
      }
    })();

    if (ENABLE_TEST_ACCOUNTS) {
      await seedTestAccounts();
      console.log('[Seed] ✅ Comptes test activés par ENABLE_TEST_ACCOUNTS=true');
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Serveur démarré sur le port ${PORT}`);
      console.log(`🌍 FRONTEND_URL: ${process.env.FRONTEND_URL || 'non défini'}`);
    });
  } catch (error) {
    console.error('❌ Erreur démarrage:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => { await sequelize.close(); process.exit(0); });
process.on('SIGINT',  async () => { await sequelize.close(); process.exit(0); });

startServer();
