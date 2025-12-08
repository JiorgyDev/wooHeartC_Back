// models/message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  // ID de la conversación a la que pertenece
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: [true, 'El mensaje debe pertenecer a una conversación'],
    index: true // Índice para buscar mensajes rápido
  },
  
  // Usuario que envió el mensaje
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El mensaje debe tener un remitente'],
    index: true
  },
  
  // Contenido del mensaje (solo texto por ahora)
  content: {
    type: String,
    required: [true, 'El contenido del mensaje es requerido'],
    trim: true,
    maxlength: [2000, 'El mensaje no puede exceder 2000 caracteres']
  },
  
  // Estado del mensaje
  isRead: {
    type: Boolean,
    default: false
  },
  
  // Timestamp de cuando fue leído
  readAt: {
    type: Date,
    default: null
  },
  
  // Tipo de mensaje (para futuras expansiones: texto, imagen, etc.)
  messageType: {
    type: String,
    enum: ['text', 'image', 'file'], // Por ahora solo usaremos 'text'
    default: 'text'
  }
  
}, {
  timestamps: true, // Agrega createdAt y updatedAt automáticamente
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ========================================
// ÍNDICES PARA OPTIMIZAR BÚSQUEDAS
// ========================================

// Índice compuesto para buscar mensajes de una conversación ordenados
messageSchema.index({ conversationId: 1, createdAt: -1 });

// Índice para buscar mensajes no leídos
messageSchema.index({ conversationId: 1, isRead: 1 });

// ========================================
// MIDDLEWARE: Actualizar conversación después de crear mensaje
// ========================================

messageSchema.post('save', async function(doc) {
  try {
    // Buscar la conversación
    const Conversation = mongoose.model('Conversation');
    const conversation = await Conversation.findById(doc.conversationId);
    
    if (conversation) {
      // Actualizar el último mensaje de la conversación
      await conversation.updateLastMessage(doc.content, doc.senderId);
    }
  } catch (error) {
    console.error('Error actualizando conversación:', error);
  }
});

// ========================================
// MÉTODO ESTÁTICO: Obtener mensajes de una conversación
// ========================================

messageSchema.statics.getConversationMessages = async function(
  conversationId, 
  options = {}
) {
  const {
    limit = 50,        // Límite de mensajes por página
    skip = 0,          // Para paginación
    before = null      // Para cargar mensajes anteriores a una fecha
  } = options;
  
  const query = { conversationId };
  
  // Si se especifica un timestamp, traer mensajes anteriores
  if (before) {
    query.createdAt = { $lt: new Date(before) };
  }
  
  return await this.find(query)
    .populate('senderId', 'name avatar')
    .sort({ createdAt: -1 }) // Más recientes primero
    .limit(limit)
    .skip(skip);
};

// ========================================
// MÉTODO ESTÁTICO: Marcar mensajes como leídos
// ========================================

messageSchema.statics.markAsRead = async function(conversationId, userId) {
  // Marcar todos los mensajes no leídos de esta conversación
  // que NO fueron enviados por el usuario actual
  const result = await this.updateMany(
    {
      conversationId: conversationId,
      senderId: { $ne: userId }, // $ne = "not equal"
      isRead: false
    },
    {
      $set: {
        isRead: true,
        readAt: new Date()
      }
    }
  );
  
  // También actualizar el contador en la conversación
  const Conversation = mongoose.model('Conversation');
  const conversation = await Conversation.findById(conversationId);
  
  if (conversation) {
    await conversation.markAsRead(userId);
  }
  
  return result;
};

// ========================================
// MÉTODO ESTÁTICO: Contar mensajes no leídos
// ========================================

messageSchema.statics.countUnread = async function(conversationId, userId) {
  return await this.countDocuments({
    conversationId: conversationId,
    senderId: { $ne: userId },
    isRead: false
  });
};

// ========================================
// MÉTODO DE INSTANCIA: Marcar este mensaje como leído
// ========================================

messageSchema.methods.markThisAsRead = async function() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    return await this.save();
  }
  return this;
};

// ========================================
// VIRTUAL: Tiempo transcurrido (para el frontend)
// ========================================

messageSchema.virtual('timeAgo').get(function() {
  // Este virtual se puede usar en el frontend, pero es mejor
  // calcularlo allí con el package 'intl' de Flutter
  return null;
});

// ========================================
// MÉTODO ESTÁTICO: Eliminar mensajes de una conversación
// ========================================

messageSchema.statics.deleteConversationMessages = async function(conversationId) {
  return await this.deleteMany({ conversationId });
};

module.exports = mongoose.model('Message', messageSchema);