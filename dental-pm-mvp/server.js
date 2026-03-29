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
const { authenticateToken: requireAuth } = require('./middleware/auth');

const app  = express();
const PORT = process.env.PORT || 8001;

app.set('trust proxy', 1);
app.use(helmet());

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

// ── Routes ── Structure IDENTIQUE à l'originale ───────────────────────────────
// (requireAuth uniquement là où il était dans l'original)
app.use('/api/auth',             authRoutes);
app.use('/api/patients',         patientRoutes);
app.use('/api/appointments',     appointmentRoutes);
app.use('/api/invoices',         invoiceRoutes);
app.use('/api/quotes',           requireAuth, quoteRoutes);
app.use('/api/integrations',     integrationRoutes);
app.use('/api/dashboard',        dashboardRoutes);
app.use('/api/inventory',        inventoryRoutes);
app.use('/api/suppliers',        supplierRoutes);
app.use('/api/labs',             requireAuth, labRoutes);
app.use('/api/mailing',          requireAuth, mailingRoutes);
app.use('/api/media',            requireAuth, mediaRoutes);
app.use('/api/subscriptions',    requireAuth, subscriptionsRoutes);
app.use('/api/billing',          requireAuth, billingRoutes);
app.use('/api/admin',            requireAuth, adminRoutes);
app.use('/api/legal',            legalRoutes);
app.use('/api/pricing-schedules',requireAuth, pricingRoutes);
app.use('/api/procedure-fees',   requireAuth, pricingRoutes);
app.use('/api/documents',        requireAuth, documentRoutes);
app.use('/api/prescriptions',    requireAuth, prescriptionRoutes);
app.use('/api/reports',          requireAuth, reportsRoutes);
app.use('/api/messaging',        requireAuth, messagingRoutes);
app.use('/api/purchases',        requireAuth, purchasesRoutes);
app.use('/api/onboarding',       requireAuth, onboardingRoutes);

// Routes avec chemins relatifs (montées sur /api)
app.use('/api', requireAuth, prescriptionRoutes);
app.use('/api', requireAuth, odontogramRoutes);
app.use('/api', requireAuth, dentalChartRoutes);

app.get('/api/subscription/status', requireAuth, getSubscriptionStatus);

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
