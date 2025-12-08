const express = require('express');
const router = express.Router();
const {
  sendMessage,
  getMessages,
  markAsRead,
  deleteMessage
} = require('../controllers/messageController');
const { protect } = require('../controllers/authController');

// Todas las rutas requieren autenticación
router.use(protect);

router.post('/', sendMessage);
router.get('/:conversationId', getMessages);
router.put('/:messageId/read', markAsRead);
router.delete('/:messageId', deleteMessage);

module.exports = router;