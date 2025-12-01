const mongoose = require('mongoose');

// Definimos el esquema (estructura) de un comentario
const commentSchema = new mongoose.Schema(
  {
    // Referencia al pet (mascota) que se está comentando
    petId: {
      type: mongoose.Schema.Types.ObjectId,  // Tipo: ID de MongoDB
      ref: 'Pet',                             // Hace referencia al modelo Pet
      required: [true, 'El ID del pet es obligatorio'],
      index: true                             // Índice para buscar rápido por petId
    },

    // Referencia al usuario que hizo el comentario
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',                            // Hace referencia al modelo User
      required: [true, 'El ID del usuario es obligatorio'],
      index: true
    },

    // Nombre del usuario (para mostrarlo sin hacer query extra)
    username: {
      type: String,
      required: [true, 'El nombre de usuario es obligatorio'],
      trim: true                              // Elimina espacios al inicio/final
    },

    // Contenido del comentario
    content: {
      type: String,
      required: [true, 'El comentario no puede estar vacío'],
      trim: true,
      minlength: [1, 'El comentario debe tener al menos 1 carácter'],
      maxlength: [500, 'El comentario no puede tener más de 500 caracteres']
    }
  },
  {
    // Opciones del esquema
    timestamps: true  // Crea automáticamente createdAt y updatedAt
  }
);

// Creamos el modelo a partir del esquema
const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;