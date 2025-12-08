const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const { uploadPetImage } = require('../middleware/upload');
const { ROLES } = require('../models/user');

// Rutas públicas
router.get('/:id/profile', userController.getUserProfile);
router.get('/:id/stats', userController.getUserStats);

// Proteger todas las rutas después de este middleware
router.use(authController.protect);

// RUTA DE BÚSQUEDA
router.get('/search', userController.searchUsers);

// Rutas de usuario autenticado
router.get('/me', userController.getMe);
router.patch('/me', userController.updateMe);
router.patch('/me/avatar', uploadPetImage.single('avatar'), userController.updateAvatar);
router.delete('/me', userController.deleteMe);

// Favoritos
router.get('/favorites', userController.getFavorites);
router.post('/favorites/:petId', userController.addToFavorites);
router.delete('/favorites/:petId', userController.removeFromFavorites);

// Rutas de administrador
router.use(authController.restrictTo(ROLES.ADMIN));

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;