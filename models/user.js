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
    select: false // No incluir password en queries por defecto
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
  // Para refugios/organizaciones
  organizationName: {
    type: String,
    required: function() {
      return this.role === 'shelter';
    }
  },
  // INFORMACIÓN ESPECÍFICA PARA COORDINADORES DE REFUGIO
shelterInfo: {
  name: {
    type: String,
    required: function() {
      return this.role === ROLES.SHELTER_COORDINATOR;
    }
  },
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
    animalTypes: [String], // ['dog', 'cat', 'bird', 'other']
    sizes: [String], // ['small', 'medium', 'large']
    ages: [String], // ['young', 'adult', 'senior']
    maxDistance: { type: Number, default: 50 } // km
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

// Middleware para hashear password antes de guardar
// MIDDLEWARE PARA MIGRAR ROLES EXISTENTES
userSchema.pre('save', async function(next) {
  // Solo hashear si el password fue modificado
  if (!this.isModified('password')) return next();
  
  // Hashear password con cost de 12
  this.password = await bcrypt.hash(this.password, 12);
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