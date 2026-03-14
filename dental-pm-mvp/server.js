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

const allowedOrigins = process.env.FRONTEND_URL 
  ? [process.env.FRONTEND_URL]
  : ['http://localhost:3000'];

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Trop de requêtes depuis cette adresse IP, réessayez plus tard.'
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

app.get('/api/openapi.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const serverUrl = process.env.OPENAPI_SERVER_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
  const openApiSpec = {
    "openapi": "3.0.0",
    "info": {
      "title": "Dental Practice Management API - Madagascar",
      "version": "1.0.0",
      "description": "API SaaS pour la gestion de cliniques dentaires à Madagascar"
    },
    "servers": [{ "url": `${serverUrl}/api`, "description": "API Server" }],
    "components": {
      "securitySchemes": {
        "bearerAuth": { "type": "http", "scheme": "bearer", "bearerFormat": "JWT" }
      }
    },
    "paths": {
      "/auth/login": {
        "post": {
          "summary": "Authenticate user",
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "username": { "type": "string" },
                    "password": { "type": "string" }
                  }
                }
              }
            }
          },
          "responses": { "200": { "description": "Login successful" } }
        }
      },
      "/patients": {
        "get": {
          "summary": "Get patients list",
          "security": [{ "bearerAuth": [] }],
          "responses": { "200": { "description": "Patients list" } }
        },
        "post": {
          "summary": "Create patient",
          "security": [{ "bearerAuth": [] }],
          "responses": { "201": { "description": "Patient created" } }
        }
      },
      "/appointments": {
        "get": {
          "summary": "Get appointments list",
          "security": [{ "bearerAuth": [] }],
          "responses": { "200": { "description": "Appointments list" } }
        },
        "post": {
          "summary": "Create appointment",
          "security": [{ "bearerAuth": [] }],
          "responses": { "201": { "description": "Appointment created" } }
        }
      },
      "/health": {
        "get": {
          "summary": "Health check",
          "responses": { "200": { "description": "Service status" } }
        }
      },
      "/billing/plans": {
        "get": {
          "summary": "Get available subscription plans",
          "security": [{ "bearerAuth": [] }],
          "responses": { "200": { "description": "Plans list with pricing" } }
        }
      },
      "/billing/subscription": {
        "get": {
          "summary": "Get current clinic subscription",
          "security": [{ "bearerAuth": [] }],
          "responses": { "200": { "description": "Subscription details" } }
        }
      },
      "/billing/payment-requests": {
        "get": {
          "summary": "Get clinic payment requests",
          "security": [{ "bearerAuth": [] }],
          "responses": { "200": { "description": "Payment requests list" } }
        },
        "post": {
          "summary": "Submit payment request with receipt",
          "security": [{ "bearerAuth": [] }],
          "responses": { "201": { "description": "Payment request created" } }
        }
      },
      "/admin/payment-requests": {
        "get": {
          "summary": "Get all payment requests (Super Admin)",
          "security": [{ "bearerAuth": [] }],
          "responses": { "200": { "description": "Payment requests list" } }
        }
      }
    }
  };
  res.json(openApiSpec);
});

app.get('/openapi.json', (req, res) => res.redirect('/api/openapi.json'));

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
    console.log('✅ Base de données prête');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Serveur Dental PM Madagascar démarré sur le port ${PORT}`);
      console.log(`📍 API Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Erreur de démarrage du serveur:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => { await sequelize.close(); process.exit(0); });
process.on('SIGINT',  async () => { await sequelize.close(); process.exit(0); });

startServer();
