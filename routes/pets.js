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

// Importar middlewares - ACTUALIZADO PARA MÚLTIPLES IMÁGENES
const { protect } = require('./auth');
const { uploadPetImages, handleUploadError, processUploadedImages } = require('../middleware/upload');

// ===== RUTAS PÚBLICAS =====
// RUTA DE PRUEBA
router.get('/test/upload', (req, res) => {
  res.json({
    message: 'Endpoint de prueba funcionando',
    cloudinary: {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? 'OK' : 'FALTA',
      api_key: process.env.CLOUDINARY_API_KEY ? 'OK' : 'FALTA',
      api_secret: process.env.CLOUDINARY_API_SECRET ? 'OK' : 'FALTA'
    }
  });
});

// IMPORTANTE: Las rutas específicas DEBEN ir ANTES que las rutas con parámetros (:id)

router.get('/', getPets); // GET /api/v1/pets - Feed principal

// RUTA DE PRUEBA SIN IMAGEN
router.post('/test/simple', (req, res) => {
  console.log('📋 Test simple - Body:', req.body);
  res.json({
    success: true,
    message: 'Test sin imagen funcionando',
    received: req.body
  });
}); 

router.get('/popular', getPopularPets); // GET /api/v1/pets/popular - Mascotas populares  
router.get('/search', searchPets); // GET /api/v1/pets/search - Búsqueda
router.get('/user/my-pets', getMyPets); // GET /api/v1/pets/user/my-pets - Mis mascotas

// Esta ruta DEBE ir después de todas las rutas específicas
router.get('/:id', getPetById); // GET /api/v1/pets/:id - Mascota específica

// ===== RUTAS PROTEGIDAS =====
// router.use(protect); // COMENTADO TEMPORALMENTE

// Middleware de debugging
router.use((req, res, next) => {
  if (req.method === 'POST') {
    console.log('🛣️ POST detectado en ruta pets');
  }
  next();
});

// RUTAS CON UPLOAD DE IMÁGENES - ACTUALIZADO PARA MÚLTIPLES IMÁGENES
router.post('/', uploadPetImages.array('images', 5), handleUploadError, processUploadedImages, createPet);
router.put('/:id', uploadPetImages.array('images', 5), handleUploadError, processUploadedImages, updatePet);
router.delete('/:id', deletePet); // DELETE /api/v1/pets/:id - Eliminar mascota

// Rutas de interacción
router.post('/:id/like', toggleLikePet); // POST /api/v1/pets/:id/like - Toggle like
router.post('/:id/favorite', toggleFavoritePet); // POST /api/v1/pets/:id/favorite - Toggle favorito

module.exports = router;