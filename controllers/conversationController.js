// controllers/conversationController.js
const Conversation = require('../models/conversation');
const Message = require('../models/message');
const User = require('../models/user');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// ========================================
// OBTENER TODAS LAS CONVERSACIONES DEL USUARIO
// ========================================

exports.getMyConversations = catchAsync(async (req, res, next) => {
  const userId = req.user.id; // El middleware protect ya agregó req.user
  
  // Obtener conversaciones del usuario
  const conversations = await Conversation.findUserConversations(userId);
  
  // Formatear las conversaciones para el frontend
  const formattedConversations = conversations.map(conv => {
    // Encontrar el otro participante (no el usuario actual)
    const otherParticipant = conv.participants.find(
      p => p._id.toString() !== userId
    );
    
    // Obtener el contador de no leídos para este usuario
    const unreadCount = conv.unreadCount.get(userId) || 0;
    
    return {
      id: conv._id,
      otherUser: {
        id: otherParticipant._id,
        name: otherParticipant.name,
        email: otherParticipant.email,
        avatar: otherParticipant.avatar
      },
      lastMessage: conv.lastMessage.content || 'Sin mensajes',
      lastMessageTime: conv.lastMessage.timestamp || conv.createdAt,
      lastMessageSender: conv.lastMessage.senderId,
      unreadCount: unreadCount,
      updatedAt: conv.updatedAt
    };
  });
  
  res.status(200).json({
    status: 'success',
    results: formattedConversations.length,
    data: {
      conversations: formattedConversations
    }
  });
});

// ========================================
// CREAR O OBTENER CONVERSACIÓN CON UN USUARIO
// ========================================

exports.createOrGetConversation = catchAsync(async (req, res, next) => {
  const userId = req.user.id; // Usuario actual
  const { otherUserId } = req.body;
  
  // Validar que se envió el otro usuario
  if (!otherUserId) {
    return next(new AppError('Debes especificar con quién quieres chatear', 400));
  }
  
  // Verificar que no intente crear conversación consigo mismo
  if (userId === otherUserId) {
    return next(new AppError('No puedes crear una conversación contigo mismo', 400));
  }
  
  // Verificar que el otro usuario existe
  const otherUser = await User.findById(otherUserId);
  if (!otherUser) {
    return next(new AppError('El usuario no existe', 404));
  }
  
  // Buscar si ya existe una conversación entre estos usuarios
  let conversation = await Conversation.findConversationBetween(userId, otherUserId);
  
  // Si no existe, crearla
  if (!conversation) {
    conversation = await Conversation.create({
      participants: [userId, otherUserId],
      lastMessage: {
        content: '',
        senderId: userId,
        timestamp: new Date()
      }
    });
    
    // Poblar los datos de los participantes
    conversation = await Conversation.findById(conversation._id)
      .populate('participants', 'name email avatar');
  }
  
  // Formatear respuesta
  const otherParticipant = conversation.participants.find(
    p => p._id.toString() !== userId
  );
  
  const unreadCount = conversation.unreadCount.get(userId) || 0;
  
  res.status(200).json({
    status: 'success',
    data: {
      conversation: {
        id: conversation._id,
        otherUser: {
          id: otherParticipant._id,
          name: otherParticipant.name,
          email: otherParticipant.email,
          avatar: otherParticipant.avatar
        },
        lastMessage: conversation.lastMessage.content || 'Sin mensajes',
        lastMessageTime: conversation.lastMessage.timestamp || conversation.createdAt,
        unreadCount: unreadCount,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt
      }
    }
  });
});

// ========================================
// OBTENER UNA CONVERSACIÓN ESPECÍFICA POR ID
// ========================================

exports.getConversationById = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { conversationId } = req.params;
  
  // Buscar la conversación
  const conversation = await Conversation.findById(conversationId)
    .populate('participants', 'name email avatar')
    .populate('lastMessage.senderId', 'name avatar');
  
  if (!conversation) {
    return next(new AppError('Conversación no encontrada', 404));
  }
  
  // Verificar que el usuario es participante de esta conversación
  const isParticipant = conversation.participants.some(
    p => p._id.toString() === userId
  );
  
  if (!isParticipant) {
    return next(new AppError('No tienes acceso a esta conversación', 403));
  }
  
  // Encontrar el otro participante
  const otherParticipant = conversation.participants.find(
    p => p._id.toString() !== userId
  );
  
  const unreadCount = conversation.unreadCount.get(userId) || 0;
  
  res.status(200).json({
    status: 'success',
    data: {
      conversation: {
        id: conversation._id,
        otherUser: {
          id: otherParticipant._id,
          name: otherParticipant.name,
          email: otherParticipant.email,
          avatar: otherParticipant.avatar
        },
        lastMessage: conversation.lastMessage.content || 'Sin mensajes',
        lastMessageTime: conversation.lastMessage.timestamp || conversation.createdAt,
        unreadCount: unreadCount,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt
      }
    }
  });
});

// ========================================
// OBTENER MENSAJES DE UNA CONVERSACIÓN
// ========================================

exports.getConversationMessages = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { conversationId } = req.params;
  
  // Opciones de paginación
  const limit = parseInt(req.query.limit) || 50;
  const skip = parseInt(req.query.skip) || 0;
  const before = req.query.before; // Timestamp para cargar mensajes anteriores
  
  // Verificar que la conversación existe y el usuario es participante
  const conversation = await Conversation.findById(conversationId);
  
  if (!conversation) {
    return next(new AppError('Conversación no encontrada', 404));
  }
  
  const isParticipant = conversation.participants.some(
    p => p.toString() === userId
  );
  
  if (!isParticipant) {
    return next(new AppError('No tienes acceso a esta conversación', 403));
  }
  
  // Obtener mensajes
  const messages = await Message.getConversationMessages(conversationId, {
    limit,
    skip,
    before
  });
  
  // Marcar mensajes como leídos
  await Message.markAsRead(conversationId, userId);
  
  // Formatear mensajes para el frontend
  const formattedMessages = messages.map(msg => ({
    id: msg._id,
    content: msg.content,
    senderId: msg.senderId._id,
    senderName: msg.senderId.name,
    senderAvatar: msg.senderId.avatar,
    isRead: msg.isRead,
    readAt: msg.readAt,
    createdAt: msg.createdAt,
    isMine: msg.senderId._id.toString() === userId // Para saber si lo envió el usuario actual
  }));
  
  res.status(200).json({
    status: 'success',
    results: formattedMessages.length,
    data: {
      messages: formattedMessages.reverse() // Invertir para que el más antiguo esté primero
    }
  });
});

// ========================================
// ELIMINAR UNA CONVERSACIÓN
// ========================================

exports.deleteConversation = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { conversationId } = req.params;
  
  // Buscar la conversación
  const conversation = await Conversation.findById(conversationId);
  
  if (!conversation) {
    return next(new AppError('Conversación no encontrada', 404));
  }
  
  // Verificar que el usuario es participante
  const isParticipant = conversation.participants.some(
    p => p.toString() === userId
  );
  
  if (!isParticipant) {
    return next(new AppError('No tienes acceso a esta conversación', 403));
  }
  
  // Eliminar todos los mensajes de la conversación
  await Message.deleteConversationMessages(conversationId);
  
  // Eliminar la conversación
  await Conversation.findByIdAndDelete(conversationId);
  
  res.status(204).json({
    status: 'success',
    data: null
  });
});

// ========================================
// MARCAR CONVERSACIÓN COMO LEÍDA
// ========================================

exports.markConversationAsRead = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { conversationId } = req.params;
  
  // Verificar que la conversación existe
  const conversation = await Conversation.findById(conversationId);
  
  if (!conversation) {
    return next(new AppError('Conversación no encontrada', 404));
  }
  
  // Verificar que el usuario es participante
  const isParticipant = conversation.participants.some(
    p => p.toString() === userId
  );
  
  if (!isParticipant) {
    return next(new AppError('No tienes acceso a esta conversación', 403));
  }
  
  // Marcar mensajes como leídos
  await Message.markAsRead(conversationId, userId);
  
  res.status(200).json({
    status: 'success',
    message: 'Conversación marcada como leída'
  });
});