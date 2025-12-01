const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { protect } = require('../middleware/auth');  // Middleware de autenticación

// ============================================
// RUTAS DE COMENTARIOS
// ============================================

// Crear un comentario nuevo
// POST /api/comments
// Requiere estar autenticado (protect)
router.post('/', protect, commentController.createComment);

// Obtener todos los comentarios de un pet
// GET /api/comments/pet/:petId
// NO requiere autenticación (cualquiera puede ver comentarios)
router.get('/pet/:petId', commentController.getCommentsByPet);

// Eliminar un comentario (BONUS)
// DELETE /api/comments/:commentId
// Requiere estar autenticado
router.delete('/:commentId', protect, commentController.deleteComment);

module.exports = router;