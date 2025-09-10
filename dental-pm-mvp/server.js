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
const integrationRoutes = require('./routes/integrations');
const dashboardRoutes = require('./routes/dashboard');
const inventoryRoutes = require('./routes/inventory');
const supplierRoutes = require('./routes/suppliers');
const labRoutes = require('./routes/labs');
const mailingRoutes = require('./routes/mailing');
const mediaRoutes = require('./routes/media');
const subscriptionsRoutes = require('./routes/subscriptions');
const billingRoutes = require('./routes/billing');
const { getSubscriptionStatus } = require('./middleware/licensing');

const app = express();
const PORT = process.env.PORT || 8001;

// Security middleware
app.use(helmet());

// CORS configuration - more permissive for preview environments
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://dentalpm-1.preview.emergentagent.com',
        process.env.FRONTEND_URL || 'http://localhost:3000'
      ]
    : true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
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

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/labs', labRoutes);
app.use('/api/mailing', mailingRoutes);
app.use('/api/media', mediaRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Dental Practice Management API - Madagascar',
    version: '1.0.0'
  });
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
    
    app.listen(PORT, () => {
      console.log(`🚀 Serveur Dental PM Madagascar démarré sur le port ${PORT}`);
      console.log(`📍 API Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
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