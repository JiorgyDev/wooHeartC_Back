// routes/payments.js
const express = require('express');
const paymentController = require('../controllers/paymentController');
const authController = require('../controllers/authController');

const router = express.Router();

// ============================================
// ⚠️ IMPORTANTE: El webhook YA está manejado en app.js
// NO agregues router.post('/webhook', ...) aquí
// ============================================

// ============================================
// RUTAS PROTEGIDAS (Requieren autenticación)
// ============================================
router.use(authController.protect);

// Crear pagos
router.post('/apoyo', paymentController.createApoyoPayment);
router.post('/suscripcion', paymentController.createSuscripcionPayment);
router.post('/adopcion', paymentController.createAdopcionPayment);

// Obtener historial
router.get('/my-payments', paymentController.getMyPayments);
router.get('/my-subscriptions', paymentController.getMySubscriptions);

// Cancelar suscripción
router.patch('/subscriptions/:subscriptionId/cancel', paymentController.cancelSubscription);

// ✅ NUEVAS RUTAS: Historial y estadísticas
router.get('/history', paymentController.getUserHistory);
router.get('/stats', paymentController.getUserStats);

module.exports = router;