// controllers/messageController.js
const Message = require('../models/message');
const Conversation = require('../models/conversation');
const mongoose = require('mongoose');

// @desc    Send a message
// @route   POST /api/v1/messages
// @access  Private
exports.sendMessage = async (req, res, next) => {
  try {
    const { conversationId, content } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'El contenido del mensaje no puede estar vacío'
      });
    }

    // Verificar que la conversación existe
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversación no encontrada'
      });
    }

    // Verificar que el usuario es participante de la conversación
    const isParticipant = conversation.participants.some(
      p => p.toString() === req.user.id
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para enviar mensajes en esta conversación'
      });
    }

    // ✅ CAMBIO: Usar conversationId y senderId
    const message = await Message.create({
      conversationId: conversationId,
      senderId: req.user.id,
      content: content.trim()
    });

    // Poblar información del sender antes de enviar
    await message.populate('senderId', 'name avatar');

    // Emitir evento de Socket.io
    if (req.app.get('io')) {
      const io = req.app.get('io');
      
      conversation.participants.forEach(participantId => {
        if (participantId.toString() !== req.user.id) {
          io.to(participantId.toString()).emit('new_message', {
            conversationId: conversation._id,
            message: message
          });
        }
      });
    }

    res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar el mensaje',
      error: error.message
    });
  }
};

// @desc    Get messages from a conversation
// @route   GET /api/v1/messages/:conversationId
// @access  Private
exports.getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Verificar que la conversación existe
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversación no encontrada'
      });
    }

    // Verificar que el usuario es participante
    const isParticipant = conversation.participants.some(
      p => p.toString() === req.user.id
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para ver estos mensajes'
      });
    }

    // ✅ CAMBIO: Buscar por conversationId
    const messages = await Message.find({ conversationId: conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'name avatar');

    const total = await Message.countDocuments({ conversationId: conversationId });

    // ✅ CAMBIO: Actualizar con senderId
    await Message.updateMany(
      {
        conversationId: conversationId,
        senderId: { $ne: req.user.id },
        isRead: false
      },
      { isRead: true, readAt: Date.now() }
    );

    // Emitir evento de mensajes leídos
    if (req.app.get('io')) {
      const io = req.app.get('io');
      conversation.participants.forEach(participantId => {
        if (participantId.toString() !== req.user.id) {
          io.to(participantId.toString()).emit('messages_read', {
            conversationId: conversation._id,
            readBy: req.user.id
          });
        }
      });
    }

    res.status(200).json({
      success: true,
      count: messages.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: messages.reverse()
    });
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los mensajes'
    });
  }
};

// @desc    Mark message as read
// @route   PUT /api/v1/messages/:messageId/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Mensaje no encontrado'
      });
    }

    // ✅ CAMBIO: Verificar con senderId
    if (message.senderId.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'No puedes marcar como leído tu propio mensaje'
      });
    }

    const conversation = await Conversation.findById(message.conversationId);
    const isParticipant = conversation.participants.some(
      p => p.toString() === req.user.id
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para marcar este mensaje'
      });
    }

    message.isRead = true;
    message.readAt = Date.now();
    await message.save();

    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.to(message.senderId.toString()).emit('message_read', {
        messageId: message._id,
        conversationId: conversation._id,
        readBy: req.user.id,
        readAt: message.readAt
      });
    }

    res.status(200).json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar el mensaje como leído'
    });
  }
};

// @desc    Delete a message
// @route   DELETE /api/v1/messages/:messageId
// @access  Private
exports.deleteMessage = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Mensaje no encontrado'
      });
    }

    // ✅ CAMBIO: Verificar con senderId
    if (message.senderId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Solo puedes eliminar tus propios mensajes'
      });
    }

    await message.deleteOne();

    if (req.app.get('io')) {
      const io = req.app.get('io');
      const conversation = await Conversation.findById(message.conversationId);
      
      conversation.participants.forEach(participantId => {
        if (participantId.toString() !== req.user.id) {
          io.to(participantId.toString()).emit('message_deleted', {
            messageId: message._id,
            conversationId: conversation._id
          });
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Mensaje eliminado correctamente'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar el mensaje'
    });
  }
};