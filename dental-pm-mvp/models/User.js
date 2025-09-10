const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../database/connection');

const User = sequelize.define('users', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 50],
      notEmpty: true
    }
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      notEmpty: true
    }
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  full_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [2, 100],
      notEmpty: true
    }
  },
  clinic_id: {
    type: DataTypes.UUID,
    allowNull: true, // Allow null for super-admin users
    references: {
      model: 'clinics',
      key: 'id'
    },
    onDelete: 'CASCADE',
    comment: 'Clinic this user belongs to (null for super-admin)'
  },
  role: {
    type: DataTypes.ENUM('ADMIN', 'DENTIST', 'ASSISTANT', 'ACCOUNTANT'),
    allowNull: false,
    defaultValue: 'DENTIST'
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: {
      is: /^\+261\s?\d{2}\s?\d{2}\s?\d{3}\s?\d{2}$/ // Madagascar phone format
    }
  },
  specialization: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'For dentists: orthodontist, oral surgeon, etc.'
  },
  nif_number: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Numéro d\'Identification Fiscale (Madagascar)'
  },
  stat_number: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Numéro STAT (Madagascar)'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  last_login_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  profile_image_url: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  indexes: [
    { fields: ['email'] },
    { fields: ['username'] },
    { fields: ['role'] },
    { fields: ['is_active'] }
  ]
});

// Instance methods
User.prototype.validatePassword = async function(password) {
  return bcrypt.compare(password, this.password_hash);
};

User.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password_hash;
  return values;
};

// Class methods
User.hashPassword = async function(password) {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

// Hooks
User.beforeCreate(async (user) => {
  if (user.password_hash) {
    user.password_hash = await User.hashPassword(user.password_hash);
  }
});

User.beforeUpdate(async (user) => {
  if (user.changed('password_hash')) {
    user.password_hash = await User.hashPassword(user.password_hash);
  }
});

module.exports = User;