// models/conversation.js
const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  // Array con los 2 usuarios participantes
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  
  // Último mensaje enviado (para mostrar en la lista de conversaciones)
  lastMessage: {
    content: {
      type: String,
      default: ''
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  
  // Contador de mensajes no leídos por cada participante
  unreadCount: {
    type: Map,
    of: Number,
    default: {}
  }
  
}, {
  timestamps: true, // Agrega createdAt y updatedAt automáticamente
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ========================================
// ÍNDICES PARA OPTIMIZAR BÚSQUEDAS
// ========================================

// Índice compuesto para buscar conversaciones por participantes
conversationSchema.index({ participants: 1 });

// Índice para ordenar por última actualización
conversationSchema.index({ updatedAt: -1 });

// ========================================
// VALIDACIÓN PERSONALIZADA
// ========================================

// Asegurar que siempre hay exactamente 2 participantes
conversationSchema.pre('save', function(next) {
  if (this.participants.length !== 2) {
    return next(new Error('Una conversación debe tener exactamente 2 participantes'));
  }
  
  // Verificar que los participantes no sean el mismo usuario
  if (this.participants[0].toString() === this.participants[1].toString()) {
    return next(new Error('No puedes crear una conversación contigo mismo'));
  }
  
  next();
});

// ========================================
// MÉTODO ESTÁTICO: Buscar conversación entre 2 usuarios
// ========================================

conversationSchema.statics.findConversationBetween = async function(userId1, userId2) {
  return await this.findOne({
    participants: { $all: [userId1, userId2] }
  }).populate('participants', 'name email avatar')
    .populate('lastMessage.senderId', 'name avatar');
};

// ========================================
// MÉTODO ESTÁTICO: Obtener conversaciones de un usuario
// ========================================

conversationSchema.statics.findUserConversations = async function(userId) {
  return await this.find({
    participants: userId
  })
    .populate('participants', 'name email avatar')
    .populate('lastMessage.senderId', 'name avatar')
    .sort({ updatedAt: -1 }); // Ordenar por más reciente
};

// ========================================
// MÉTODO DE INSTANCIA: Actualizar último mensaje
// ========================================

conversationSchema.methods.updateLastMessage = async function(messageContent, senderId) {
  this.lastMessage = {
    content: messageContent,
    senderId: senderId,
    timestamp: new Date()
  };
  
  // Incrementar contador de no leídos para el otro participante
  const otherParticipantId = this.participants.find(
    id => id.toString() !== senderId.toString()
  ).toString();
  
  const currentUnread = this.unreadCount.get(otherParticipantId) || 0;
  this.unreadCount.set(otherParticipantId, currentUnread + 1);
  
  return await this.save();
};

// ========================================
// MÉTODO DE INSTANCIA: Marcar como leído
// ========================================

conversationSchema.methods.markAsRead = async function(userId) {
  this.unreadCount.set(userId.toString(), 0);
  return await this.save();
};

// ========================================
// VIRTUAL: Obtener el otro participante
// ========================================

conversationSchema.virtual('otherParticipant').get(function() {
  // Este virtual lo usaremos desde el frontend para obtener 
  // fácilmente al otro usuario de la conversación
  return null; // Se calculará en el controller
});

module.exports = mongoose.model('Conversation', conversationSchema);