const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { User, AuditLog } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

// Register new user
router.post('/register', [
  body('username')
    .isLength({ min: 3, max: 50 })
    .withMessage('Le nom d\'utilisateur doit contenir entre 3 et 50 caractères')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Le nom d\'utilisateur ne peut contenir que des lettres, chiffres, tirets et underscores'),
  body('email')
    .isEmail()
    .withMessage('Email invalide')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  body('full_name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Le nom complet doit contenir entre 2 et 100 caractères'),
  body('role')
    .isIn(['ADMIN', 'DENTIST', 'ASSISTANT', 'ACCOUNTANT'])
    .withMessage('Rôle invalide')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const { username, email, password, full_name, role, phone, specialization, nif_number, stat_number } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        $or: [{ username }, { email }]
      }
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'Un utilisateur existe déjà avec ce nom d\'utilisateur ou cet email'
      });
    }

    // Create new user
    const user = await User.create({
      username,
      email,
      password_hash: password, // Will be hashed by the model hook
      full_name,
      role,
      phone,
      specialization,
      nif_number,
      stat_number
    });

    // Log the registration
    await AuditLog.create({
      user_id: user.id,
      action: 'CREATE',
      resource_type: 'users',
      resource_id: user.id,
      new_values: { username, email, full_name, role },
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      description: `Nouvel utilisateur enregistré: ${username}`
    });

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Erreur lors de la création de l\'utilisateur'
    });
  }
});

// Login user
router.post('/login', [
  body('username').notEmpty().withMessage('Nom d\'utilisateur requis'),
  body('password').notEmpty().withMessage('Mot de passe requis')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const { username, password } = req.body;

    // Find user by username or email
    const user = await User.findOne({
      where: {
        $or: [{ username }, { email: username }]
      }
    });

    if (!user || !user.is_active) {
      return res.status(401).json({
        error: 'Nom d\'utilisateur ou mot de passe incorrect'
      });
    }

    // Validate password
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Nom d\'utilisateur ou mot de passe incorrect'
      });
    }

    // Update last login
    await user.update({ last_login_at: new Date() });

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Log the login
    await AuditLog.create({
      user_id: user.id,
      action: 'LOGIN',
      resource_type: 'auth',
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      description: `Connexion utilisateur: ${user.username}`
    });

    res.json({
      message: 'Connexion réussie',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        specialization: user.specialization
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Erreur lors de la connexion'
    });
  }
});

// Logout user
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Log the logout
    await AuditLog.create({
      user_id: req.user.id,
      action: 'LOGOUT',
      resource_type: 'auth',
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      description: `Déconnexion utilisateur: ${req.user.username}`
    });

    res.json({ message: 'Déconnexion réussie' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Erreur lors de la déconnexion'
    });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password_hash'] }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé'
      });
    }

    res.json(user);
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération du profil'
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, [
  body('full_name').optional().isLength({ min: 2, max: 100 }),
  body('phone').optional().matches(/^\+261\s?\d{2}\s?\d{2}\s?\d{3}\s?\d{2}$/),
  body('specialization').optional().isLength({ max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const { full_name, phone, specialization } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé'
      });
    }

    const oldValues = {
      full_name: user.full_name,
      phone: user.phone,
      specialization: user.specialization
    };

    await user.update({
      full_name: full_name || user.full_name,
      phone: phone || user.phone,
      specialization: specialization || user.specialization
    });

    // Log the update
    await AuditLog.create({
      user_id: user.id,
      action: 'UPDATE',
      resource_type: 'users',
      resource_id: user.id,
      old_values: oldValues,
      new_values: { full_name, phone, specialization },
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      description: `Mise à jour profil utilisateur: ${user.username}`
    });

    res.json({
      message: 'Profil mis à jour avec succès',
      user: await User.findByPk(user.id, {
        attributes: { exclude: ['password_hash'] }
      })
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      error: 'Erreur lors de la mise à jour du profil'
    });
  }
});

module.exports = router;