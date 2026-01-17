const express = require('express');
const router = express.Router();

// ============================================
// IMPORTAR CONTROLADORES
// ============================================
const {
  getPets,
  getPopularPets,
  getPetById,
  createPet,
  updatePet,
  deletePet,
  toggleLikePet,
  createComment,
  getComments,
  incrementShare,
  getLikedPets,
  getAdoptedPets,     // ✅ AGREGADO - Nueva función
  getSupportedPets  
} = require('../controllers/petController');

// ============================================
// IMPORTAR MIDDLEWARES
// ============================================
const { protect, shelterCoordinatorOrAdmin, authenticatedUsers, optionalAuth } = require('../controllers/authController');
const { uploadPetImages, handleUploadError, processUploadedImages } = require('../middleware/upload');

// ============================================
// RUTAS PÚBLICAS
// ============================================

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

// RUTA DE PRUEBA SIN IMAGEN
router.post('/test/simple', (req, res) => {
  console.log('📋 Test simple - Body:', req.body);
  res.json({
    success: true,
    message: 'Test sin imagen funcionando',
    received: req.body
  });
});

// ============================================
// RUTAS ESPECÍFICAS (ANTES DE /:id)
// ⚠️ IMPORTANTE: Estas rutas DEBEN ir ANTES de /:id
// ============================================
router.get('/', optionalAuth, getPets);           // GET /api/v1/pets - Feed principal (con auth opcional)
router.get('/popular', getPopularPets);           // GET /api/v1/pets/popular - Mascotas populares
router.get('/liked', protect, getLikedPets);      // GET /api/v1/pets/liked - Mascotas con like
router.get('/adopted', protect, getAdoptedPets);  // ✅ AGREGADO - GET /api/v1/pets/adopted - Mascotas adoptadas
router.get('/supported', protect, getSupportedPets); 

// ============================================
// RUTAS DE INTERACCIÓN CON PARÁMETRO :id
// ============================================
router.get('/:id/comments', getComments);         // GET /api/v1/pets/:id/comments - Obtener comentarios
router.post('/:id/share', incrementShare);        // POST /api/v1/pets/:id/share - Incrementar shares

// ⚠️ Esta ruta DEBE ir DESPUÉS de todas las rutas específicas
router.get('/:id', getPetById);                   // GET /api/v1/pets/:id - Mascota específica

// ============================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ============================================
router.use(protect); // Middleware: todas las rutas siguientes requieren autenticación

// Middleware de debugging
router.use((req, res, next) => {
  if (req.method === 'POST') {
    console.log('🛣️ POST detectado en ruta pets');
  }
  next();
});

// ============================================
// RUTAS CON UPLOAD DE IMÁGENES
// ============================================
router.post('/', uploadPetImages.array('images', 5), handleUploadError, processUploadedImages, createPet);

// RUTA: Para actualizaciones simples SIN imágenes (como cambiar adoptionStatus)
router.patch('/:id/adopt-status', updatePet);

// RUTA: Para actualizaciones CON imágenes
router.put('/:id', uploadPetImages.array('images', 5), handleUploadError, processUploadedImages, updatePet);

router.delete('/:id', deletePet); // DELETE /api/v1/pets/:id - Eliminar mascota

// ============================================
// RUTAS DE INTERACCIÓN (PROTEGIDAS)
// ============================================
router.post('/:id/like', toggleLikePet);          // POST /api/v1/pets/:id/like - Toggle like
router.post('/:id/comment', createComment);       // POST /api/v1/pets/:id/comment - Crear comentario

module.exports = router;