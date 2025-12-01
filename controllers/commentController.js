const Comment = require('../models/comment');
const Pet = require('../models/pet');
const User = require('../models/user');

// ============================================
// FUNCIÓN 1: CREAR un comentario nuevo
// ============================================
exports.createComment = async (req, res) => {
  try {
    // 1. Extraemos los datos que vienen de Flutter
    const { petId, content } = req.body;
    const userId = req.user.id;  // Viene del token de autenticación

    // 2. Validamos que el pet existe
    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({
        success: false,
        message: 'Mascota no encontrada'
      });
    }

    // 3. Obtenemos el nombre del usuario para guardarlo
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // 4. Creamos el comentario en la base de datos
    const newComment = await Comment.create({
      petId,
      userId,
      username: user.name,  // Guardamos el nombre para mostrarlo después
      content
    });

    // 5. Enviamos respuesta exitosa a Flutter
    res.status(201).json({
      success: true,
      message: 'Comentario creado exitosamente',
      data: newComment
    });

  } catch (error) {
    console.error('Error al crear comentario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear el comentario',
      error: error.message
    });
  }
};

// ============================================
// FUNCIÓN 2: OBTENER todos los comentarios de un pet
// ============================================
exports.getCommentsByPet = async (req, res) => {
  try {
    // 1. Obtenemos el ID del pet desde la URL
    const { petId } = req.params;

    // 2. Validamos que el pet existe
    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({
        success: false,
        message: 'Mascota no encontrada'
      });
    }

    // 3. Buscamos TODOS los comentarios de ese pet
    const comments = await Comment.find({ petId })
      .sort({ createdAt: -1 })  // Los más nuevos primero
      .select('userId username content createdAt');  // Solo campos necesarios

    // 4. Enviamos los comentarios a Flutter
    res.status(200).json({
      success: true,
      count: comments.length,  // Cuántos comentarios hay
      data: comments
    });

  } catch (error) {
    console.error('Error al obtener comentarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener comentarios',
      error: error.message
    });
  }
};

// ============================================
// FUNCIÓN 3: ELIMINAR un comentario (BONUS)
// ============================================
exports.deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    // 1. Buscamos el comentario
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comentario no encontrado'
      });
    }

    // 2. Verificamos que el usuario sea el dueño del comentario
    if (comment.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para eliminar este comentario'
      });
    }

    // 3. Eliminamos el comentario
    await Comment.findByIdAndDelete(commentId);

    res.status(200).json({
      success: true,
      message: 'Comentario eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar comentario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar el comentario',
      error: error.message
    });
  }
};