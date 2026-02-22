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
const { getSubscriptionStatus } = require('./middleware/licensing');
const { authenticateToken: requireAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 8001;

// Trust proxy for correct IP behind load balancer/reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration - permissive for preview environments
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://localhost:3000',
    'https://clinic-mgmt-mvp.preview.emergentagent.com',
    'https://clinic-mgmt-mvp.preview.emergentagent.com',
    'https://*.emergentagent.com',
    process.env.FRONTEND_URL || 'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Trop de requêtes depuis cette adresse IP, réessayez plus tard.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploads
app.use('/uploads', express.static('uploads'));

// Health check endpoint (MUST be before requireAuth routes)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Dental Practice Management API - Madagascar',
    version: '1.0.0'
  });
});

// API Routes
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
app.use('/api/legal', legalRoutes);  // Public access for legal pages
app.use('/api/pricing-schedules', requireAuth, pricingRoutes);
app.use('/api/procedure-fees', requireAuth, pricingRoutes);  // For PUT /api/procedure-fees/:id
app.use('/api/documents', requireAuth, documentRoutes);
app.use('/api', requireAuth, prescriptionRoutes);
app.use('/api', requireAuth, odontogramRoutes);
app.use('/api/reports', requireAuth, reportsRoutes);
app.use('/api/messaging', requireAuth, messagingRoutes);

// Licensing status endpoint
app.get('/api/subscription/status', requireAuth, getSubscriptionStatus);

// OpenAPI JSON endpoint
app.get('/api/openapi.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const openApiSpec = {
    "openapi": "3.0.0",
    "info": {
      "title": "Dental Practice Management API - Madagascar",
      "version": "1.0.0",
      "description": "API SaaS pour la gestion de cliniques dentaires à Madagascar"
    },
    "servers": [
      {
        "url": "https://clinic-mgmt-mvp.preview.emergentagent.com/api",
        "description": "Preview Environment"
      }
    ],
    "components": {
      "securitySchemes": {
        "bearerAuth": {
          "type": "http",
          "scheme": "bearer",
          "bearerFormat": "JWT"
        }
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
          "responses": {
            "200": { "description": "Login successful" }
          }
        }
      },
      "/patients": {
        "get": {
          "summary": "Get patients list",
          "security": [{ "bearerAuth": [] }],
          "responses": {
            "200": { "description": "Patients list" }
          }
        },
        "post": {
          "summary": "Create patient",
          "security": [{ "bearerAuth": [] }],
          "responses": {
            "201": { "description": "Patient created" }
          }
        }
      },
      "/appointments": {
        "get": {
          "summary": "Get appointments list",
          "security": [{ "bearerAuth": [] }],
          "responses": {
            "200": { "description": "Appointments list" }
          }
        },
        "post": {
          "summary": "Create appointment",
          "security": [{ "bearerAuth": [] }],
          "responses": {
            "201": { "description": "Appointment created" }
          }
        }
      },
      "/appointments/{id}/export-calendar": {
        "get": {
          "summary": "Export appointment to calendar (.ics)",
          "security": [{ "bearerAuth": [] }],
          "parameters": [
            {
              "name": "id",
              "in": "path",
              "required": true,
              "schema": { "type": "string" }
            }
          ],
          "responses": {
            "200": {
              "description": "Calendar file",
              "content": {
                "text/calendar": {}
              }
            }
          }
        }
      },
      "/health": {
        "get": {
          "summary": "Health check",
          "responses": {
            "200": { "description": "Service status" }
          }
        }
      },
      "/billing/plans": {
        "get": {
          "summary": "Get available subscription plans",
          "security": [{ "bearerAuth": [] }],
          "responses": {
            "200": { "description": "Plans list with pricing" }
          }
        }
      },
      "/billing/subscription": {
        "get": {
          "summary": "Get current clinic subscription",
          "security": [{ "bearerAuth": [] }],
          "responses": {
            "200": { "description": "Subscription details" }
          }
        }
      },
      "/billing/payment-requests": {
        "get": {
          "summary": "Get clinic payment requests",
          "security": [{ "bearerAuth": [] }],
          "responses": {
            "200": { "description": "Payment requests list" }
          }
        },
        "post": {
          "summary": "Submit payment request with receipt",
          "security": [{ "bearerAuth": [] }],
          "requestBody": {
            "required": true,
            "content": {
              "multipart/form-data": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "plan_code": { "type": "string", "enum": ["ESSENTIAL", "PRO", "GROUP"] },
                    "payment_method": { "type": "string", "enum": ["MVOLA", "ORANGE_MONEY", "AIRTEL_MONEY", "BANK_TRANSFER", "CASH"] },
                    "reference": { "type": "string" },
                    "receipt": { "type": "string", "format": "binary" }
                  }
                }
              }
            }
          },
          "responses": {
            "201": { "description": "Payment request created" },
            "409": { "description": "Duplicate reference" }
          }
        }
      },
      "/admin/payment-requests": {
        "get": {
          "summary": "Get all payment requests (Super Admin)",
          "security": [{ "bearerAuth": [] }],
          "parameters": [
            {
              "name": "status",
              "in": "query",
              "schema": { "type": "string", "enum": ["PENDING", "VERIFIED", "REJECTED"] }
            }
          ],
          "responses": {
            "200": { "description": "Payment requests list" }
          }
        }
      },
      "/admin/payment-requests/{id}/verify": {
        "patch": {
          "summary": "Verify payment request and activate subscription",
          "security": [{ "bearerAuth": [] }],
          "parameters": [
            {
              "name": "id",
              "in": "path",
              "required": true,
              "schema": { "type": "string", "format": "uuid" }
            }
          ],
          "responses": {
            "200": { "description": "Payment verified, subscription activated" },
            "409": { "description": "Request already processed" }
          }
        }
      },
      "/admin/payment-requests/{id}/reject": {
        "patch": {
          "summary": "Reject payment request",
          "security": [{ "bearerAuth": [] }],
          "parameters": [
            {
              "name": "id",
              "in": "path",
              "required": true,
              "schema": { "type": "string", "format": "uuid" }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "note_admin": { "type": "string" }
                  },
                  "required": ["note_admin"]
                }
              }
            }
          },
          "responses": {
            "200": { "description": "Payment rejected" },
            "409": { "description": "Request already processed" }
          }
        }
      }
    }
  };
  
  res.json(openApiSpec);
});

// Redirect /openapi.json to /api/openapi.json for compatibility
app.get('/openapi.json', (req, res) => {
  res.redirect('/api/openapi.json');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Une erreur interne s\'est produite' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route non trouvée',
    path: req.originalUrl 
  });
});

// Database connection and server startup
async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion à PostgreSQL réussie');
    
    // Sync database (create tables if they don't exist)
    // Skip sync since we already seeded the database
    console.log('✅ Base de données prête');
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Serveur Dental PM Madagascar démarré sur le port ${PORT}`);
      console.log(`📍 API Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Host binding: 0.0.0.0:${PORT} (accessible via preview proxy)`);
    });
  } catch (error) {
    console.error('❌ Erreur de démarrage du serveur:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🔄 Arrêt gracieux du serveur...');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🔄 Arrêt gracieux du serveur...');
  await sequelize.close();
  process.exit(0);
});

startServer();