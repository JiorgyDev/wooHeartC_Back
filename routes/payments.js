const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middleware/auth'); // Ajusta la ruta según tu proyecto

// ============================================
// RUTAS PÚBLICAS (sin autenticación)
// ============================================

// Webhook de Stripe (NO usa protect, Stripe lo llama directamente)
router.post('/webhook', paymentController.webhook);

// ============================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ============================================

// Crear pago único (Apoyar)
router.post(
  '/create-payment-intent',
  protect, // Middleware de autenticación (opcional)
  paymentController.createPaymentIntent
);

// Crear suscripción (Suscribir/Adoptar)
router.post(
  '/create-subscription',
  protect,
  paymentController.createSubscription
);

// Cancelar suscripción
router.post(
  '/cancel-subscription',
  protect,
  paymentController.cancelSubscription
);

// Obtener historial de pagos
router.get(
  '/history',
  protect,
  paymentController.getPaymentHistory
);

module.exports = router;