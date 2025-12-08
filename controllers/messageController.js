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

    // Crear el mensaje
    const message = await Message.create({
      conversation: conversationId,
      sender: req.user.id,
      content: content.trim()
    });

    // Actualizar la conversación
    conversation.lastMessage = message._id;
    conversation.updatedAt = Date.now();
    await conversation.save();

    // Poblar información del sender antes de enviar
    await message.populate('sender', 'name avatar');

    // Emitir evento de Socket.io (el servidor lo manejará)
    if (req.app.get('io')) {
      const io = req.app.get('io');
      
      // Enviar a todos los participantes excepto al sender
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
      message: 'Error al enviar el mensaje'
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

    // Obtener mensajes (más recientes primero)
    const messages = await Message.find({ conversation: conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'name avatar');

    // Contar total de mensajes
    const total = await Message.countDocuments({ conversation: conversationId });

    // Marcar mensajes como leídos
    await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: req.user.id },
        read: false
      },
      { read: true, readAt: Date.now() }
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
      data: messages.reverse() // Invertir para que los más antiguos estén primero
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

    // Verificar que el usuario no es el sender
    if (message.sender.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'No puedes marcar como leído tu propio mensaje'
      });
    }

    // Verificar que el usuario es participante de la conversación
    const conversation = await Conversation.findById(message.conversation);
    const isParticipant = conversation.participants.some(
      p => p.toString() === req.user.id
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para marcar este mensaje'
      });
    }

    message.read = true;
    message.readAt = Date.now();
    await message.save();

    // Emitir evento
    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.to(message.sender.toString()).emit('message_read', {
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

    // Solo el sender puede eliminar el mensaje
    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Solo puedes eliminar tus propios mensajes'
      });
    }

    await message.deleteOne();

    // Emitir evento
    if (req.app.get('io')) {
      const io = req.app.get('io');
      const conversation = await Conversation.findById(message.conversation);
      
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