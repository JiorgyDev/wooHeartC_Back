// routes/auth.js
const express = require('express');
const authController = require('../controllers/authController');
const { validateRegister, validateLogin } = require('../middleware/validation');

const router = express.Router();

// LOG DE DEBUG - TEMPORAL
router.use((req, res, next) => {
  console.log('🔍 AUTH ROUTE:', req.method, req.path);
  console.log('🔍 Headers:', req.headers);
  next();
});

// Rutas públicas
router.post('/register', validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.patch('/reset-password/:token', authController.resetPassword);
router.post('/send-verification-code', authController.sendVerificationCode);
router.post('/verify-email', authController.verifyEmail);

// LOG ANTES DE PROTEGER
router.use((req, res, next) => {
  console.log('⚠️ APLICANDO PROTECCIÓN A PARTIR DE AQUÍ');
  next();
});

// Rutas protegidas
router.use(authController.protect);

router.get('/me', authController.getMe);
router.patch('/update-password', authController.updatePassword);

module.exports = router;