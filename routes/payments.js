// routes/payments.js
const express = require('express');
const paymentController = require('../controllers/paymentController');
const authController = require('../controllers/authController'); // ← CAMBIO AQUÍ

const router = express.Router();

// ============================================
// WEBHOOK DE STRIPE (NO REQUIERE AUTENTICACIÓN)
// ============================================
// IMPORTANTE: Esta ruta ya está manejada en app.js con express.raw()
router.post(
  '/webhook',
  paymentController.handleStripeWebhook
);

// ============================================
// RUTAS PROTEGIDAS (Requieren autenticación)
// ============================================
router.use(authController.protect); // ← CAMBIO AQUÍ

// Crear pagos
router.post('/apoyo', paymentController.createApoyoPayment);
router.post('/suscripcion', paymentController.createSuscripcionPayment);
router.post('/adopcion', paymentController.createAdopcionPayment);

// Obtener historial
router.get('/my-payments', paymentController.getMyPayments);
router.get('/my-subscriptions', paymentController.getMySubscriptions);

// Cancelar suscripción
router.patch('/subscriptions/:subscriptionId/cancel', paymentController.cancelSubscription);

module.exports = router;