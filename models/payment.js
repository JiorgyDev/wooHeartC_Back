// models/Payment.js
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  // Usuario que realizó el pago
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El pago debe estar asociado a un usuario']
  },
  
  // Tipo de pago
  type: {
    type: String,
    enum: ['donation', 'apoyo'],
    default: 'donation',
    required: true
  },
  
  // Monto pagado
  amount: {
    type: Number,
    required: [true, 'El monto es requerido'],
    min: [1, 'El monto mínimo es $1']
  },
  
  // Moneda (USD)
  currency: {
    type: String,
    default: 'usd',
    uppercase: true
  },
  
  // Estado del pago
  status: {
    type: String,
    enum: ['pending', 'succeeded', 'failed', 'canceled'],
    default: 'pending',
    required: true
  },
  
  // ID del PaymentIntent de Stripe
  stripePaymentIntentId: {
    type: String,
    required: true,
    unique: true
  },
  
  // ID del cliente en Stripe
  stripeCustomerId: {
    type: String,
    required: true
  },
  
  // Descripción del pago
  description: {
    type: String,
    default: ''
  },
  
  // Fecha en que se completó el pago
  paidAt: {
    type: Date
  },
  
  // Metadata adicional
  metadata: {
    type: Map,
    of: String,
    default: {}
  }
}, {
  timestamps: true, // Crea automáticamente createdAt y updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ============================================
// ÍNDICES (para búsquedas rápidas)
// ============================================
paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ stripePaymentIntentId: 1 });
paymentSchema.index({ status: 1 });

// ============================================
// VIRTUAL: Monto formateado
// ============================================
paymentSchema.virtual('amountFormatted').get(function() {
  return `$${this.amount.toFixed(2)} ${this.currency.toUpperCase()}`;
});

// ============================================
// MÉTODO ESTÁTICO: Obtener total de donaciones
// ============================================
paymentSchema.statics.getTotalDonations = async function(userId) {
  const result = await this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        status: 'succeeded'
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);

  return result[0] || { total: 0, count: 0 };
};

module.exports = mongoose.model('Payment', paymentSchema);