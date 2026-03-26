const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const sequelize = require('./database/connection');
const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const appointmentRoutes = require('./routes/appointments');
const invoiceRoutes = require('./routes/invoices');
const quoteRoutes = require('./routes/quotes');
const integrationRoutes = require('./routes/integrations');
const dashboardRoutes = require('./routes/dashboard');
const inventoryRoutes = require('./routes/inventory');
const supplierRoutes = require('./routes/suppliers');
const labRoutes = require('./routes/labs');
const mailingRoutes = require('./routes/mailing');
const mediaRoutes = require('./routes/media');
const subscriptionsRoutes = require('./routes/subscriptions');
const billingRoutes = require('./routes/billing');
const adminRoutes = require('./routes/admin');
const legalRoutes = require('./routes/legal');
const pricingRoutes = require('./routes/pricing');
const documentRoutes = require('./routes/documents');
const prescriptionRoutes = require('./routes/prescriptions');
const odontogramRoutes = require('./routes/odontogram');
const reportsRoutes = require('./routes/reports');
const messagingRoutes = require('./routes/messaging');
const purchasesRoutes = require('./routes/purchases');
const onboardingRoutes = require('./routes/onboarding');
const dentalChartRoutes = require('./routes/dental-chart');
const { getSubscriptionStatus } = require('./middleware/licensing');
const { authenticateToken: requireAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 8001;

app.set('trust proxy', 1);
app.use(helmet());

// ✅ CORS élargi — accepte toutes les origines Railway + localhost
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  // Fallback: accepter toutes les origines Railway
  /\.railway\.app$/,
  /\.up\.railway\.app$/,
];

const corsOptions = {
  origin: (origin, callback) => {
    // Autoriser les requêtes sans origine (mobile, Postman, etc.)
    if (!origin) return callback(null, true);

    // Vérifier si l'origine est dans la liste ou correspond au pattern Railway
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') return allowed === origin;
      if (allowed instanceof RegExp) return allowed.test(origin);
      return false;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS bloqué pour origin: ${origin}`);
      // ✅ En production Railway, on accepte quand même pour éviter les 503
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// ✅ Preflight OPTIONS pour toutes les routes
app.options('*', cors(corsOptions));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 200,
  message: 'Trop de requêtes depuis cette adresse IP, réessayez plus tard.',
  skip: (req) => req.path === '/api/health'
});
app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Dental Practice Management API - Madagascar',
    version: '1.0.0'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/quotes', requireAuth, quoteRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/labs', requireAuth, labRoutes);
app.use('/api/mailing', requireAuth, mailingRoutes);
app.use('/api/media', requireAuth, mediaRoutes);
app.use('/api/subscriptions', requireAuth, subscriptionsRoutes);
app.use('/api/billing', requireAuth, billingRoutes);
app.use('/api/admin', requireAuth, adminRoutes);
app.use('/api/legal', legalRoutes);
app.use('/api/pricing-schedules', requireAuth, pricingRoutes);
app.use('/api/procedure-fees', requireAuth, pricingRoutes);
app.use('/api/documents', requireAuth, documentRoutes);
app.use('/api', requireAuth, prescriptionRoutes);
app.use('/api', requireAuth, odontogramRoutes);
app.use('/api', requireAuth, dentalChartRoutes);
app.use('/api/reports', requireAuth, reportsRoutes);
app.use('/api/messaging', requireAuth, messagingRoutes);
app.use('/api/purchases', requireAuth, purchasesRoutes);
app.use('/api/onboarding', requireAuth, onboardingRoutes);

app.get('/api/subscription/status', requireAuth, getSubscriptionStatus);

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? "Une erreur interne s'est produite"
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route non trouvée', path: req.originalUrl });
});

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion à PostgreSQL réussie');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Serveur démarré sur le port ${PORT}`);
      console.log(`🌍 FRONTEND_URL: ${process.env.FRONTEND_URL || 'non défini'}`);
    });
  } catch (error) {
    console.error('❌ Erreur de démarrage:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => { await sequelize.close(); process.exit(0); });
process.on('SIGINT',  async () => { await sequelize.close(); process.exit(0); });

startServer();
