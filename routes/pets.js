// routes/pets.js
const express = require('express');
const router = express.Router();

// Importar controladores
const {
  getPets,
  getPopularPets,
  getPetById,
  createPet,
  updatePet,
  deletePet,
  toggleLikePet,
  toggleFavoritePet,
  getMyPets,
  searchPets
} = require('../controllers/petController');

// Importar middlewares
const { protect } = require('./auth');
const { uploadPetImage, handleUploadError, processUploadedImage } = require('../middleware/upload');

// ===== RUTAS PÚBLICAS =====
// IMPORTANTE: Las rutas específicas DEBEN ir ANTES que las rutas con parámetros (:id)

router.get('/', getPets); // GET /api/v1/pets - Feed principal
router.get('/popular', getPopularPets); // GET /api/v1/pets/popular - Mascotas populares  
router.get('/search', searchPets); // GET /api/v1/pets/search - Búsqueda
router.get('/user/my-pets', getMyPets); // GET /api/v1/pets/user/my-pets - Mis mascotas

// Esta ruta DEBE ir después de todas las rutas específicas
router.get('/:id', getPetById); // GET /api/v1/pets/:id - Mascota específica

// ===== RUTAS PROTEGIDAS =====
// router.use(protect); // COMENTADO TEMPORALMENTE

// RUTAS CON UPLOAD DE IMÁGENES
router.post('/', uploadPetImage.single('image'), handleUploadError, processUploadedImage, createPet);
router.put('/:id', uploadPetImage.single('image'), handleUploadError, processUploadedImage, updatePet);
router.delete('/:id', deletePet); // DELETE /api/v1/pets/:id - Eliminar mascota

// Rutas de interacción
router.post('/:id/like', toggleLikePet); // POST /api/v1/pets/:id/like - Toggle like
router.post('/:id/favorite', toggleFavoritePet); // POST /api/v1/pets/:id/favorite - Toggle favorito

module.exports = router;