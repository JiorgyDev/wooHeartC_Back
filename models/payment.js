// models/Payment.js
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El pago debe estar asociado a un usuario']
  },
  type: {
    type: String,
    enum: ['apoyo', 'suscripcion', 'adopcion'],
    required: [true, 'El tipo de pago es requerido']
  },
  amount: {
    type: Number,
    required: [true, 'El monto es requerido']
  },
  currency: {
    type: String,
    default: 'usd',
    enum: ['usd', 'bob', 'eur']
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  // IDs de Stripe
  stripePaymentIntentId: {
    type: String,
    unique: true,
    sparse: true
  },
  stripeCustomerId: {
    type: String
  },
  stripeSubscriptionId: {
    type: String,
    sparse: true
  },
  // Información adicional
  description: {
    type: String,
    default: ''
  },
  metadata: {
    type: Map,
    of: String,
    default: {}
  },
  // Para adopciones
  pet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet'
  },
  // Fecha de pago
  paidAt: {
    type: Date
  },
  // Error si falla
  errorMessage: {
    type: String
  }
}, {
  timestamps: true
});

// Índices
paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ stripePaymentIntentId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ type: 1 });

// Virtual para formatear el monto
paymentSchema.virtual('formattedAmount').get(function() {
  return `$${(this.amount / 100).toFixed(2)}`;
});

module.exports = mongoose.model('Payment', paymentSchema);