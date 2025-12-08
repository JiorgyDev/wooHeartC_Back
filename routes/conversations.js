const express = require('express');
const router = express.Router();
const {
  getMyConversations,
  createOrGetConversation,
  getConversationById,
  deleteConversation
} = require('../controllers/conversationController');
const { protect } = require('../controllers/authController');

// Todas las rutas requieren autenticación
router.use(protect);

router.route('/')
  .get(getMyConversations)
  .post(createOrGetConversation);

router.route('/:conversationId')
  .get(getConversationById)
  .delete(deleteConversation);

module.exports = router;