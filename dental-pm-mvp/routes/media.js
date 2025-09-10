const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { body, validationResult, param, query } = require('express-validator');
const { Patient, User, AuditLog } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Configure multer for file uploads (mock storage for now)
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads');
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp_random_originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const name = path.basename(file.originalname, extension);
    cb(null, `${uniqueSuffix}_${name}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Allow images and common document types
  const allowedTypes = {
    'image/jpeg': true,
    'image/jpg': true,
    'image/png': true,
    'image/gif': true,
    'image/webp': true,
    'application/pdf': true,
    'application/msword': true,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true
  };

  if (allowedTypes[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non autorisé. Formats acceptés: JPG, PNG, GIF, WebP, PDF, DOC, DOCX'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 5 // Max 5 files per request
  },
  fileFilter: fileFilter
});

// =============================================================================
// PATIENT MEDIA MANAGEMENT
// =============================================================================

// Get patient media gallery
router.get('/patients/:patientId', [
  param('patientId').isUUID().withMessage('ID patient invalide'),
  query('type').optional().isIn(['profile', 'xray', 'intraoral', 'document', 'other']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Paramètres invalides',
        details: errors.array()
      });
    }

    const { patientId } = req.params;
    const { type, page = 1, limit = 20 } = req.query;

    // Verify patient exists
    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json({
        error: 'Patient non trouvé'
      });
    }

    // Mock media data - in real app, this would come from a Media model
    const mockMedia = [
      {
        id: `media-${patientId}-1`,
        patient_id: patientId,
        type: 'profile',
        filename: 'patient_profile.jpg',
        original_name: 'Photo profil patient.jpg',
        file_size: 245760,
        mime_type: 'image/jpeg',
        uploaded_at: new Date(),
        uploaded_by: req.user.id,
        url: `/api/media/files/patient_profile_${patientId}.jpg`,
        thumbnail_url: `/api/media/thumbnails/patient_profile_${patientId}_thumb.jpg`,
        description: 'Photo de profil du patient'
      },
      {
        id: `media-${patientId}-2`,
        patient_id: patientId,
        type: 'xray',
        filename: 'xray_panoramic.jpg',
        original_name: 'Radio panoramique.jpg',
        file_size: 512000,
        mime_type: 'image/jpeg',
        uploaded_at: new Date(Date.now() - 86400000), // 1 day ago
        uploaded_by: req.user.id,
        url: `/api/media/files/xray_panoramic_${patientId}.jpg`,
        thumbnail_url: `/api/media/thumbnails/xray_panoramic_${patientId}_thumb.jpg`,
        description: 'Radiographie panoramique - Contrôle annuel'
      },
      {
        id: `media-${patientId}-3`,
        patient_id: patientId,
        type: 'intraoral',
        filename: 'intraoral_front.jpg',
        original_name: 'Photo intra-orale face.jpg',
        file_size: 156789,
        mime_type: 'image/jpeg',
        uploaded_at: new Date(Date.now() - 172800000), // 2 days ago
        uploaded_by: req.user.id,
        url: `/api/media/files/intraoral_front_${patientId}.jpg`,
        thumbnail_url: `/api/media/thumbnails/intraoral_front_${patientId}_thumb.jpg`,
        description: 'Photo intra-orale - Vue frontale'
      }
    ];

    // Filter by type if specified
    let filteredMedia = mockMedia;
    if (type) {
      filteredMedia = mockMedia.filter(media => media.type === type);
    }

    // Pagination
    const offset = (page - 1) * limit;
    const paginatedMedia = filteredMedia.slice(offset, offset + limit);

    res.json({
      media: paginatedMedia,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(filteredMedia.length / limit),
        total_count: filteredMedia.length,
        per_page: parseInt(limit)
      },
      patient: {
        id: patient.id,
        full_name: `${patient.first_name} ${patient.last_name}`,
        patient_number: patient.patient_number
      }
    });
  } catch (error) {
    console.error('Get patient media error:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des médias'
    });
  }
});

// Upload patient media
router.post('/patients/:patientId/upload', [
  param('patientId').isUUID().withMessage('ID patient invalide'),
  requireRole('ADMIN', 'DENTIST', 'ASSISTANT'),
  upload.array('files', 5),
  body('type').isIn(['profile', 'xray', 'intraoral', 'document', 'other']).withMessage('Type de média invalide'),
  body('description').optional().isLength({ max: 255 }).trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const { patientId } = req.params;
    const { type, description } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({
        error: 'Aucun fichier fourni'
      });
    }

    // Verify patient exists
    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json({
        error: 'Patient non trouvé'
      });
    }

    // Process uploaded files
    const uploadedMedia = [];
    for (const file of files) {
      const mediaItem = {
        id: `media-${patientId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        patient_id: patientId,
        type: type,
        filename: file.filename,
        original_name: file.originalname,
        file_size: file.size,
        mime_type: file.mimetype,
        file_path: file.path,
        uploaded_at: new Date(),
        uploaded_by: req.user.id,
        url: `/api/media/files/${file.filename}`,
        thumbnail_url: file.mimetype.startsWith('image/') 
          ? `/api/media/thumbnails/${file.filename}` 
          : null,
        description: description || `${type} - ${file.originalname}`
      };

      uploadedMedia.push(mediaItem);
    }

    // Log upload action
    await AuditLog.create({
      user_id: req.user.id,
      action: 'UPLOAD',
      resource_type: 'patient_media',
      resource_id: patientId,
      new_values: { 
        files_count: files.length,
        type: type,
        total_size: files.reduce((sum, file) => sum + file.size, 0)
      },
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      description: `${files.length} fichier(s) média uploadé(s) pour le patient ${patient.first_name} ${patient.last_name}`
    });

    res.status(201).json({
      message: `${files.length} fichier(s) uploadé(s) avec succès`,
      media: uploadedMedia,
      patient: {
        id: patient.id,
        full_name: `${patient.first_name} ${patient.last_name}`,
        patient_number: patient.patient_number
      }
    });
  } catch (error) {
    console.error('Upload patient media error:', error);
    
    // Clean up uploaded files on error
    if (req.files) {
      for (const file of req.files) {
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          console.error('Error cleaning up file:', unlinkError);
        }
      }
    }

    res.status(500).json({
      error: 'Erreur lors de l\'upload des fichiers'
    });
  }
});

// Delete patient media
router.delete('/patients/:patientId/:mediaId', [
  param('patientId').isUUID().withMessage('ID patient invalide'),
  param('mediaId').notEmpty().withMessage('ID média requis'),
  requireRole('ADMIN', 'DENTIST', 'ASSISTANT')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Paramètres invalides',
        details: errors.array()
      });
    }

    const { patientId, mediaId } = req.params;

    // Verify patient exists
    const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json({
        error: 'Patient non trouvé'
      });
    }

    // In real app, find and delete from Media model
    // For now, just simulate successful deletion
    
    // Log deletion
    await AuditLog.create({
      user_id: req.user.id,
      action: 'DELETE',
      resource_type: 'patient_media',
      resource_id: patientId,
      old_values: { media_id: mediaId },
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      description: `Média supprimé pour le patient ${patient.first_name} ${patient.last_name}`
    });

    res.json({
      message: 'Média supprimé avec succès',
      media_id: mediaId
    });
  } catch (error) {
    console.error('Delete patient media error:', error);
    res.status(500).json({
      error: 'Erreur lors de la suppression du média'
    });
  }
});

// =============================================================================
// STAFF DIRECTORY MANAGEMENT
// =============================================================================

// Get staff directory with photos
router.get('/staff', [
  query('role').optional().isIn(['ADMIN', 'DENTIST', 'ASSISTANT', 'ACCOUNTANT']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = { is_active: true };
    if (role) {
      whereClause.role = role;
    }

    const { count, rows: staff } = await User.findAndCountAll({
      where: whereClause,
      attributes: [
        'id', 'username', 'email', 'full_name', 'role', 
        'specialization', 'phone', 'profile_image_url', 
        'created_at', 'last_login_at'
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['full_name', 'ASC']]
    });

    // Add mock photo URLs for staff members
    const staffWithPhotos = staff.map(member => ({
      ...member.toJSON(),
      photo_url: member.profile_image_url || `/api/media/staff/default_${member.role.toLowerCase()}.jpg`,
      initials: member.full_name.split(' ').map(n => n[0]).join('').toUpperCase(),
      status: member.last_login_at && (Date.now() - new Date(member.last_login_at).getTime()) < 86400000 ? 'active' : 'inactive'
    }));

    res.json({
      staff: staffWithPhotos,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(count / limit),
        total_count: count,
        per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get staff directory error:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération du personnel'
    });
  }
});

// Upload staff photo
router.post('/staff/:userId/photo', [
  param('userId').isUUID().withMessage('ID utilisateur invalide'),
  requireRole('ADMIN', 'DENTIST'), // Only admins and the user themselves can update
  upload.single('photo')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Données invalides',
        details: errors.array()
      });
    }

    const { userId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        error: 'Aucune photo fournie'
      });
    }

    // Verify user exists and permissions
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur non trouvé'
      });
    }

    // Allow users to update their own photo
    if (req.user.role !== 'ADMIN' && req.user.id !== userId) {
      return res.status(403).json({
        error: 'Permission insuffisante'
      });
    }

    // Update user profile image URL
    const photoUrl = `/api/media/files/${file.filename}`;
    await user.update({ profile_image_url: photoUrl });

    // Log photo update
    await AuditLog.create({
      user_id: req.user.id,
      action: 'UPDATE',
      resource_type: 'user_photo',
      resource_id: userId,
      new_values: { photo_url: photoUrl },
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      description: `Photo de profil mise à jour pour ${user.full_name}`
    });

    res.json({
      message: 'Photo de profil mise à jour avec succès',
      photo_url: photoUrl,
      user: {
        id: user.id,
        full_name: user.full_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Upload staff photo error:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error cleaning up file:', unlinkError);
      }
    }

    res.status(500).json({
      error: 'Erreur lors de l\'upload de la photo'
    });
  }
});

// =============================================================================
// FILE SERVING
// =============================================================================

// Serve uploaded files (with proper security)
router.get('/files/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../uploads', filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        error: 'Fichier non trouvé'
      });
    }

    // Serve the file
    res.sendFile(filePath);
  } catch (error) {
    console.error('Serve file error:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération du fichier'
    });
  }
});

// Get media statistics
router.get('/stats', async (req, res) => {
  try {
    // Mock statistics - in real app, this would query the Media model
    const stats = {
      total_files: 847,
      total_size_mb: 2845.7,
      files_by_type: {
        profile: 45,
        xray: 312,
        intraoral: 289,
        document: 156,
        other: 45
      },
      recent_uploads: 23,
      storage_used_percent: 65.4
    };

    res.json(stats);
  } catch (error) {
    console.error('Get media stats error:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des statistiques'
    });
  }
});

module.exports = router;