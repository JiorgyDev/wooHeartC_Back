// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ENUM DE ROLES
const ROLES = {
  ADMIN: 'admin',
  SHELTER_COORDINATOR: 'shelter_coordinator', 
  USER: 'user'
};

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true,
    maxlength: [50, 'El nombre no puede exceder 50 caracteres']
  },
  email: {
    type: String,
    required: [true, 'El email es requerido'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Por favor ingresa un email válido'
    ]
  },
  password: {
    type: String,
    required: [true, 'La contraseña es requerida'],
    minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
    select: false
  },
  avatar: {
    type: String,
    default: 'https://res.cloudinary.com/wooheart/image/upload/v1/default-avatar.png'
  },
  bio: {
    type: String,
    maxlength: [200, 'La bio no puede exceder 200 caracteres'],
    default: ''
  },
  location: {
    type: String,
    maxlength: [100, 'La ubicación no puede exceder 100 caracteres'],
    default: ''
  },
  phone: {
    type: String,
    match: [/^\+?[\d\s\-\(\)]+$/, 'Por favor ingresa un teléfono válido']
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: Object.values(ROLES),
    default: ROLES.USER,
    required: true
  },
  // Para refugios/organizaciones (mantener por compatibilidad)
  organizationName: {
    type: String,
    required: function() {
      return this.role === ROLES.SHELTER_COORDINATOR;
    }
  },
  // INFORMACIÓN ESPECÍFICA PARA COORDINADORES DE REFUGIO
  shelterInfo: {
    name: String,
    address: String,
    phone: String,
    description: String,
    isVerified: {
      type: Boolean,
      default: false
    }
  },
  // Estadísticas del usuario
  stats: {
    followers: { type: Number, default: 0 },
    following: { type: Number, default: 0 },
    totalLikes: { type: Number, default: 0 },
    totalPosts: { type: Number, default: 0 }
  },
  // Mascotas favoritas
  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet'
  }],
  // Preferencias de adopción
  adoptionPreferences: {
    animalTypes: [String],
    sizes: [String],
    ages: [String],
    maxDistance: { type: Number, default: 50 }
  },
  // Configuración de notificaciones
  notifications: {
    newPets: { type: Boolean, default: true },
    messages: { type: Boolean, default: true },
    likes: { type: Boolean, default: true },
    adoptionUpdates: { type: Boolean, default: true }
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para optimizar búsquedas
userSchema.index({ email: 1 });
userSchema.index({ location: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'stats.totalPosts': -1 });

// MIDDLEWARE ÚNICO: Migración de roles Y hasheo de password
userSchema.pre('save', async function(next) {
  // 1. Migrar rol 'shelter' a 'shelter_coordinator' si existe
  if (this.role === 'shelter') {
    this.role = ROLES.SHELTER_COORDINATOR;
  }
  
  // 2. Si es shelter_coordinator y tiene organizationName, copiar a shelterInfo
  if (this.role === ROLES.SHELTER_COORDINATOR && this.organizationName) {
    if (!this.shelterInfo) {
      this.shelterInfo = {};
    }
    if (!this.shelterInfo.name) {
      this.shelterInfo.name = this.organizationName;
    }
  }
  
  // 3. Hashear password solo si fue modificado
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  
  next();
});

// Método para comparar passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Virtual para URL completa del avatar
userSchema.virtual('avatarUrl').get(function() {
  return this.avatar || 'https://res.cloudinary.com/wooheart/image/upload/v1/default-avatar.png';
});

// Virtual para followers/following populados
userSchema.virtual('followersCount').get(function() {
  return this.stats.followers;
});

userSchema.virtual('followingCount').get(function() {
  return this.stats.following;
});

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;