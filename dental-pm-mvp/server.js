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
const corsOptions = {
  origin: (origin, cb) => cb(null, true),
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
app.use('/api/pricing-schedules',requireAuth, blockMedical, pricingRoutes);
app.use('/api/procedure-fees',   requireAuth, pricingRoutes);
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
