// models/Subscription.js
const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'La suscripción debe estar asociada a un usuario']
  },
  type: {
    type: String,
    enum: ['suscripcion', 'adopcion'],
    required: [true, 'El tipo de suscripción es requerido']
  },
  status: {
    type: String,
    enum: ['active', 'canceled', 'past_due', 'unpaid', 'incomplete'],
    default: 'active'
  },
  // IDs de Stripe
  stripeSubscriptionId: {
    type: String,
    required: true,
    unique: true
  },
  stripeCustomerId: {
    type: String,
    required: true
  },
  stripePriceId: {
    type: String,
    required: true
  },
  // Información de precio
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'usd'
  },
  // Fechas importantes
  currentPeriodStart: {
    type: Date
  },
  currentPeriodEnd: {
    type: Date
  },
  canceledAt: {
    type: Date
  },
  cancelAtPeriodEnd: {
    type: Boolean,
    default: false
  },
  // Para adopciones
  pet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet'
  },
  // Metadata adicional
  metadata: {
    type: Map,
    of: String,
    default: {}
  }
}, {
  timestamps: true
});

// Índices
subscriptionSchema.index({ user: 1, status: 1 });
subscriptionSchema.index({ stripeSubscriptionId: 1 });
subscriptionSchema.index({ status: 1 });

// Virtual para saber si está activa
subscriptionSchema.virtual('isActive').get(function() {
  return this.status === 'active' && (!this.cancelAtPeriodEnd);
});

// Método para cancelar
subscriptionSchema.methods.cancel = async function() {
  this.status = 'canceled';
  this.canceledAt = new Date();
  await this.save();
};

module.exports = mongoose.model('Subscription', subscriptionSchema);