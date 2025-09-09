// routes/users.js
const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const { uploadPetImage } = require('../middleware/upload');

const router = express.Router();

// Aplicar protección a todas las rutas después de este punto
router.use(authController.protect);

// Rutas del usuario actual
router.get('/me', userController.getMe);
router.patch('/update-me', userController.updateMe);
router.patch('/update-avatar', uploadPetImage.single('avatar'), userController.updateAvatar);
router.delete('/delete-me', userController.deleteMe);
router.get('/my-stats', userController.getUserStats);

// Rutas de favoritos
router.post('/favorites/:petId', userController.addToFavorites);
router.delete('/favorites/:petId', userController.removeFromFavorites);
router.get('/favorites', userController.getFavorites);

// Rutas públicas de perfiles - MOVER ANTES del middleware de protección
router.get('/profile/:id', userController.getUserProfile);
router.get('/stats/:id', userController.getUserStats);

// Rutas de admin
router.use(authController.restrictTo('admin'));

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