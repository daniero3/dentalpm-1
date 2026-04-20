const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const rateLimit = require('express-rate-limit');
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

const app  = express();
const PORT = process.env.PORT || 8001;

// ✅ CORS inconditionnel — tout premier middleware
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

app.set('trust proxy', 1);
app.use(helmet());

// ✅ CORS headers INCONDITIONNELS — avant tout middleware
// Garantit que même les erreurs 500 ont les bons headers CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

// ── CORS ──────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://dentalpracticemada.com',
  'https://www.dentalpracticemada.com',
  'https://gracious-serenity-production-e854.up.railway.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

const corsOptions = {
  origin: (origin, cb) => cb(null, true), // accepte tout
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS','PATCH'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With','Accept'],
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(rateLimit({ windowMs: 15*60*1000, max: 500, skip: r => r.path === '/api/health' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
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

// ── Version publique ──────────────────────────────────────────────────────────
app.get('/api/version', (req, res) => {
  res.json({
    version: '2.0.0',
    deployed_at: '2026-04-17 06:41',
    isolation: 'clinic_scope_active',
    stripe_only: true
  });
});

// ── Routes ── Structure IDENTIQUE à l'originale ───────────────────────────────
// (requireAuth uniquement là où il était dans l'original)
app.use('/api/auth',             authRoutes);
app.use('/api/patients',         requireAuth, requireClinicScope, blockMedical, patientRoutes);
app.use('/api/appointments',     requireAuth, requireClinicScope, blockMedical, appointmentRoutes);
app.use('/api/invoices',         requireAuth, requireClinicScope, blockMedical, invoiceRoutes);
app.use('/api/quotes',           requireAuth, requireClinicScope, blockMedical, quoteRoutes);
app.use('/api/integrations',     integrationRoutes);
app.use('/api/dashboard',        requireAuth, requireClinicScope, blockMedical, dashboardRoutes);
app.use('/api/inventory',        requireAuth, requireClinicScope, blockMedical, inventoryRoutes);
app.use('/api/suppliers',        requireAuth, requireClinicScope, blockMedical, supplierRoutes);
app.use('/api/labs',             requireAuth, requireClinicScope, blockMedical, labRoutes);
app.use('/api/mailing',          requireAuth, requireClinicScope, blockMedical, mailingRoutes);
app.use('/api/media',            requireAuth, mediaRoutes);
app.use('/api/subscriptions',    requireAuth, subscriptionsRoutes);
// Webhooks de paiement — SANS auth (appelés par MVola/Orange depuis l'extérieur)
app.use('/api/billing/webhook/stripe', billingRoutes); // raw body pour vérification signature Stripe
app.use('/api/billing/webhook',    billingRoutes);
app.use('/api/billing',          requireAuth, billingRoutes);
app.use('/api/admin',            requireAuth, requireSuperAdmin, adminRoutes);
app.use('/api/legal',            legalRoutes);
app.use('/api/pricing-schedules',requireAuth, requireClinicScope, pricingRoutes);
app.use('/api/procedure-fees',   requireAuth, requireClinicScope, pricingRoutes);
app.use('/api/documents',        requireAuth, requireClinicScope, blockMedical, documentRoutes);
app.use('/api/prescriptions',    requireAuth, requireClinicScope, blockMedical, prescriptionRoutes);
app.use('/api/reports',          requireAuth, requireClinicScope, blockMedical, reportsRoutes);
app.use('/api/messaging',        requireAuth, messagingRoutes);
app.use('/api/purchases',        requireAuth, requireClinicScope, blockMedical, purchasesRoutes);
app.use('/api/onboarding',       requireAuth, onboardingRoutes);

// Routes avec chemins relatifs (montées sur /api)
app.use('/api', requireAuth, requireClinicScope, blockMedical, prescriptionRoutes);
app.use('/api', requireAuth, requireClinicScope, blockMedical, odontogramRoutes);
app.use('/api', requireAuth, requireClinicScope, blockMedical, dentalChartRoutes);

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
  console.error('Unhandled error:', err.message);
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.status(err.status || 500).json({ error: err.message || "Erreur interne" });
});

app.use('*', (req, res) => {
  res.status(404).json({ error:'Route non trouvée', path: req.originalUrl });
});

// ── Start ─────────────────────────────────────────────────────────────────────
async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion à PostgreSQL réussie');
    // ── Démarrer le gestionnaire automatique d'abonnements ──────────────────
// Le cron est intégré dans billing.js et démarre automatiquement au require()
// startSubscriptionCron() est appelé par billingRoutes à l'initialisation

// Exécuter migrations au démarrage
(async () => {
  try {
    const { Sequelize } = require('sequelize');
    const migration = require('./migrations/20260418-stripe-subscription-id');
    const { sequelize } = require('./models');
    const qi = sequelize.getQueryInterface();
    await migration.up(qi, Sequelize);
    console.log('✅ Migrations exécutées');
  } catch(e) { console.log('Migration (non-fatal):', e.message); }
})();


// ── Seed comptes test (exécuté une seule fois) ───────────────────────────────
(async () => {
  try {
    const { User, Clinic, Subscription } = require('./models');
    const ACCOUNTS = [
      { username:'test_essential', email:'essential@dentalpm-test.mg', password:'DentalPM2026!', full_name:'Admin Essential', role:'ADMIN', plan:'ESSENTIAL', clinicName:'Cabinet Test ESSENTIAL', phone:'034 00 000 01' },
      { username:'test_pro',       email:'pro@dentalpm-test.mg',       password:'DentalPM2026!', full_name:'Admin Pro',        role:'ADMIN', plan:'PRO',       clinicName:'Cabinet Test PRO',       phone:'034 00 000 02' },
      { username:'test_group',     email:'group@dentalpm-test.mg',     password:'DentalPM2026!', full_name:'Admin Group',      role:'ADMIN', plan:'GROUP',     clinicName:'Cabinet Test GROUP',     phone:'034 00 000 03' },
    ];
    const PLAN_PRICES = { ESSENTIAL:149000, PRO:199000, GROUP:299000 };
    const PLAN_USERS  = { ESSENTIAL:2, PRO:5, GROUP:50 };
    const endDate = new Date(); endDate.setFullYear(endDate.getFullYear() + 1);

    for (const acc of ACCOUNTS) {
      let clinic = await Clinic.findOne({ where: { email: acc.email } }).catch(()=>null);
      if (!clinic) {
        clinic = await Clinic.create({ name:acc.clinicName, email:acc.email, phone:acc.phone, city:'Antananarivo', subscription_status:'ACTIVE', current_plan:acc.plan, is_active:true, is_verified:true, onboarding_completed:true, max_users:PLAN_USERS[acc.plan] }).catch(()=>null);
      } else {
        await clinic.update({ subscription_status:'ACTIVE', current_plan:acc.plan }).catch(()=>{});
      }
      if (!clinic) continue;

      const existing = await User.findOne({ where:{ username:acc.username } }).catch(()=>null);
      if (!existing) {
        await User.create({ username:acc.username, email:acc.email, password_hash:acc.password, full_name:acc.full_name, role:acc.role, clinic_id:clinic.id, is_active:true, is_verified:true, onboarding_completed:true }).catch(()=>{});
      } else {
        await existing.update({ clinic_id:clinic.id, is_active:true }).catch(()=>{});
      }

      const sub = await Subscription.findOne({ where:{ clinic_id:clinic.id } }).catch(()=>null);
      if (!sub) await Subscription.create({ clinic_id:clinic.id, plan:acc.plan, status:'ACTIVE', start_date:new Date(), end_date:endDate, price_mga:PLAN_PRICES[acc.plan], max_practitioners:PLAN_USERS[acc.plan] }).catch(()=>{});
      else await sub.update({ plan:acc.plan, status:'ACTIVE', end_date:endDate }).catch(()=>{});
    }
    console.log('[Seed] ✅ Comptes test créés/mis à jour:');
    console.log('[Seed]   test_essential | DentalPM2026! | Plan ESSENTIAL');
    console.log('[Seed]   test_pro       | DentalPM2026! | Plan PRO');
    console.log('[Seed]   test_group     | DentalPM2026! | Plan GROUP');
  } catch(e) { console.warn('[Seed] non-fatal:', e.message); }
})();

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
