// routes/auth.js
const express = require('express');
const authController = require('../controllers/authController');
const { validateRegister, validateLogin } = require('../middleware/validation');

const router = express.Router();

// Rutas públicas
router.post('/register', validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.patch('/reset-password/:token', authController.resetPassword);

// Rutas protegidas
router.use(authController.protect); // Proteger todas las rutas siguientes

router.get('/me', authController.getMe); // NUEVA RUTA
router.patch('/update-password', authController.updatePassword);

module.exports = router;