// controllers/petController.js
const Pet = require('../models/pet');
const User = require('../models/user');
const { cloudinary } = require('../config/cloudinary');

// @desc    Obtener todas las mascotas disponibles (feed estilo TikTok)
// @route   GET /api/v1/pets
// @access  Public
// ✅ DESPUÉS (CORRECTO):
const getPets = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filters = {};

    if (req.query.adoptionStatus) {
      filters.adoptionStatus = req.query.adoptionStatus;
    } else {
      filters.adoptionStatus = 'available';
    }

    if (req.query.species) filters.species = req.query.species;
    if (req.query.breed) filters.breed = new RegExp(req.query.breed, 'i');

    console.log('📋 Obteniendo mascotas con filtros:', filters);
    
    // ✅ CAMBIO 1: NO usar .lean() para mantener virtuals
    const pets = await Pet.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPets = await Pet.countDocuments(filters);
    console.log(`📊 Se encontraron ${pets.length} mascotas, total: ${totalPets}`);

    // ✅ CAMBIO 2: Convertir a JSON y calcular isLiked correctamente
    const petsWithLikes = pets.map(pet => {
      const petObj = pet.toJSON(); // Incluye los virtuals (likesCount, commentsCount)
      
      // Calcular isLiked basado en el usuario autenticado
      if (req.user) {
        petObj.isLiked = pet.likes.some(like => 
          like.userId.toString() === req.user._id.toString()
        );
      } else {
        petObj.isLiked = false;
      }

      console.log(`   ${pet.name} - Likes: ${petObj.likesCount}, isLiked: ${petObj.isLiked}`);
      
      return petObj;
    });

    res.status(200).json({
      success: true,
      data: {
        pets: petsWithLikes,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalPets / limit),
          totalPets,
          hasNext: page < Math.ceil(totalPets / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error getting pets:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las mascotas',
      error: error.message
    });
  }
};

// @desc    Obtener mascotas populares (más recientes por ahora)
// @route   GET /api/v1/pets/popular
// @access  Public
const getPopularPets = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const pets = await Pet.find({
      adoptionStatus: 'available'
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      data: pets
    });

  } catch (error) {
    console.error('Error getting popular pets:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener mascotas populares',
      error: error.message
    });
  }
};

// @desc    Obtener una mascota por ID
// @route   GET /api/v1/pets/:id
// @access  Public
const getPetById = async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id).lean();

    if (!pet) {
      return res.status(404).json({
        success: false,
        message: 'Mascota no encontrada'
      });
    }

    res.status(200).json({
      success: true,
      data: pet
    });

  } catch (error) {
    console.error('Error getting pet by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la mascota',
      error: error.message
    });
  }
};

// @desc    Crear nueva mascota
// @route   POST /api/v1/pets
// @access  Private (temporalmente público)

const createPet = async (req, res) => {
  try {
    console.log('📋 Body recibido:', req.body);
    console.log('🖼️ Archivos recibidos:', req.files?.length || 0);
    
    const { name, species, breed, age, description, adoptionStatus } = req.body;

    // Validar campos requeridos
    if (!name || !species || !age) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: name, species, age'
      });
    }

    // Crear objeto de mascota
    const petData = {
      name,
      species,
      breed: breed || 'Sin especificar',
      age: parseInt(age),
      description: description || '',
      adoptionStatus: adoptionStatus || 'available'
    };

    // Agregar imágenes si existen (ya procesadas por el middleware)
    if (req.body.imageUrls && req.body.imageUrls.length > 0) {
      petData.imageUrls = req.body.imageUrls;
      petData.imagePublicIds = req.body.imagePublicIds;
      petData.imageUrl = req.body.imageUrl;
      petData.imagePublicId = req.body.imagePublicId;
    }

    console.log('💾 Datos a guardar:', petData);
    
    const pet = await Pet.create(petData);
    
    console.log('✅ Mascota creada exitosamente:', pet._id);

    res.status(201).json({
      success: true,
      message: 'Mascota creada exitosamente',
      data: pet
    });

  } catch (error) {
    console.error('❌ Error creando mascota:', error);
    
    // Limpiar imágenes de Cloudinary si hubo error
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          await cloudinary.uploader.destroy(file.filename);
        } catch (deleteError) {
          console.error('Error eliminando imagen:', deleteError);
        }
      }
    }
    
    res.status(400).json({
      success: false,
      message: error.message || 'Error al crear la mascota',
      error: error.message
    });
  }
};


// @desc    Actualizar mascota
// @route   PUT /api/v1/pets/:id
// @access  Private (temporalmente público)
const updatePet = async (req, res) => {
   console.log('🔄 UPDATE PET LLAMADO:', req.params.id);
  console.log('📦 DATOS RECIBIDOS:', req.body);
  console.log('📦 adoptionStatus que llega:', req.body.adoptionStatus);
  
  
  try {
    let pet = await Pet.findById(req.params.id);

    if (!pet) {
      return res.status(404).json({
        success: false,
        message: 'Mascota no encontrada'
      });
    }

    console.log('📋 Actualizando mascota:', req.params.id);
    console.log('🖼️ Archivos nuevos recibidos:', req.files?.length || 0);
    console.log('🖼️ Imágenes existentes del frontend:', req.body.existingImages);

    const allowedUpdates = [
      'name', 'species', 'breed', 'age', 'description', 'adoptionStatus'
    ];

    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // MANEJAR IMÁGENES
    let finalImageUrls = [];
    let finalImagePublicIds = [];

    // 1. Procesar imágenes existentes que se mantienen
    let existingImages = [];
    if (req.body.existingImages) {
      try {
        existingImages = JSON.parse(req.body.existingImages);
      } catch (e) {
        console.error('Error parsing existingImages:', e);
        existingImages = [];
      }
    }

    // 2. Identificar imágenes a eliminar de Cloudinary
    const currentImages = pet.imageUrls || [];
    const currentPublicIds = pet.imagePublicIds || [];
    
    const imagesToDelete = currentImages.filter(url => !existingImages.includes(url));
    const publicIdsToDelete = [];
    
    imagesToDelete.forEach(urlToDelete => {
      const index = currentImages.indexOf(urlToDelete);
      if (index !== -1 && currentPublicIds[index]) {
        publicIdsToDelete.push(currentPublicIds[index]);
      }
    });

    // 3. Eliminar imágenes de Cloudinary
    for (const publicId of publicIdsToDelete) {
      try {
        console.log('🗑️ Eliminando de Cloudinary:', publicId);
        await cloudinary.uploader.destroy(publicId);
      } catch (deleteError) {
        console.error('Error deleting image from cloudinary:', deleteError);
      }
    }

    // 4. Agregar imágenes existentes que se mantienen
    existingImages.forEach(url => {
      const index = currentImages.indexOf(url);
      if (index !== -1) {
        finalImageUrls.push(url);
        if (currentPublicIds[index]) {
          finalImagePublicIds.push(currentPublicIds[index]);
        }
      }
    });

    // 5. Agregar nuevas imágenes subidas
    if (req.files && req.files.length > 0) {
      const newUrls = req.files.map(file => file.path);
      const newPublicIds = req.files.map(file => file.filename);
      
      finalImageUrls = [...finalImageUrls, ...newUrls];
      finalImagePublicIds = [...finalImagePublicIds, ...newPublicIds];
      
      console.log('📸 Nuevas imágenes agregadas:', newUrls.length);
    }

    // 6. Actualizar campos de imágenes
    updates.imageUrls = finalImageUrls;
    updates.imagePublicIds = finalImagePublicIds;
    
    // Mantener compatibilidad con imagen individual
    updates.imageUrl = finalImageUrls.length > 0 ? finalImageUrls[0] : null;
    updates.imagePublicId = finalImagePublicIds.length > 0 ? finalImagePublicIds[0] : null;

    console.log('💾 Imágenes finales a guardar:', finalImageUrls.length);

    pet = await Pet.findByIdAndUpdate(req.params.id, updates, { 
      new: true, 
      runValidators: true 
    });

    console.log('💾 MASCOTA ACTUALIZADA:', pet.adoptionStatus);
    res.status(200).json({
      success: true,
      message: 'Mascota actualizada exitosamente',
      data: pet
    });

  } catch (error) {
    console.error('Error updating pet:', error);
    res.status(400).json({
      success: false,
      message: 'Error al actualizar la mascota',
      error: error.message
    });
  }
};

// @desc    Eliminar mascota
// @route   DELETE /api/v1/pets/:id
// @access  Private (temporalmente público)
const deletePet = async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id);

    if (!pet) {
      return res.status(404).json({
        success: false,
        message: 'Mascota no encontrada'
      });
    }

    // ELIMINAR IMAGEN DE CLOUDINARY SI EXISTE
    if (pet.imagePublicId) {
      try {
        await cloudinary.uploader.destroy(pet.imagePublicId);
      } catch (deleteError) {
        console.error('Error deleting image from cloudinary:', deleteError);
      }
    }

    await Pet.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Mascota eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error deleting pet:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar la mascota',
      error: error.message
    });
  }
};

// @desc    Toggle like en una mascota (simplificado para desarrollo)
// @route   POST /api/v1/pets/:id/like
// @access  Private (temporalmente público)
const toggleLikePet = async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id);

    if (!pet) {
      return res.status(404).json({
        success: false,
        message: 'Mascota no encontrada'
      });
    }

    const userId = req.user._id;
    const likeIndex = pet.likes.findIndex(
      like => like.userId.toString() === userId.toString()
    );

    let isLiked;

    if (likeIndex > -1) {
      // Ya tiene like, quitarlo
      pet.likes.splice(likeIndex, 1);
      isLiked = false;
      console.log('❤️ Like removido por usuario:', req.user.name);

      // ✅ NUEVO: Quitar de favorites del usuario
      await User.findByIdAndUpdate(
        userId,
        { $pull: { favorites: pet._id } }
      );
    } else {
      // No tiene like, agregarlo
      pet.likes.push({ userId, createdAt: new Date() });
      isLiked = true;
      console.log('💖 Like agregado por usuario:', req.user.name);

      // ✅ NUEVO: Agregar a favorites del usuario (sin duplicados)
      await User.findByIdAndUpdate(
        userId,
        { $addToSet: { favorites: pet._id } }
      );
    }

    await pet.save();

    res.status(200).json({
      success: true,
      message: isLiked ? 'Like agregado' : 'Like removido',
      data: {
        petId: pet._id,
        isLiked,
        likesCount: pet.likes.length
      }
    });

  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar el like',
      error: error.message
    });
  }
};

// @desc    Crear comentario en una mascota
// @route   POST /api/v1/pets/:id/comment
// @access  Private
const createComment = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El contenido del comentario es requerido'
      });
    }

    if (content.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'El comentario no puede exceder 500 caracteres'
      });
    }

    const pet = await Pet.findById(req.params.id);

    if (!pet) {
      return res.status(404).json({
        success: false,
        message: 'Mascota no encontrada'
      });
    }

    const newComment = {
      userId: req.user._id,
      username: req.user.name,
      content: content.trim(),
      createdAt: new Date()
    };

    pet.comments.push(newComment);
    await pet.save();

    console.log('💬 Comentario creado por:', req.user.name);

    res.status(201).json({
      success: true,
      message: 'Comentario creado exitosamente',
      data: {
        comment: newComment,
        commentsCount: pet.comments.length
      }
    });

  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear el comentario',
      error: error.message
    });
  }
};

// @desc    Obtener comentarios de una mascota
// @route   GET /api/v1/pets/:id/comments
// @access  Public
const getComments = async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id).select('comments').lean();

    if (!pet) {
      return res.status(404).json({
        success: false,
        message: 'Mascota no encontrada'
      });
    }

    // Ordenar comentarios por más recientes
    const comments = (pet.comments || []).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.status(200).json({
      success: true,
      data: {
        comments,
        total: comments.length
      }
    });

  } catch (error) {
    console.error('Error getting comments:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener comentarios',
      error: error.message
    });
  }
};

// @desc    Incrementar contador de shares
// @route   POST /api/v1/pets/:id/share
// @access  Public
const incrementShare = async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id);

    if (!pet) {
      return res.status(404).json({
        success: false,
        message: 'Mascota no encontrada'
      });
    }

    pet.shares = (pet.shares || 0) + 1;
    await pet.save();

    console.log('🔗 Share incrementado para:', pet.name, '- Total:', pet.shares);

    res.status(200).json({
      success: true,
      message: 'Share registrado',
      data: {
        petId: pet._id,
        shares: pet.shares
      }
    });

  } catch (error) {
    console.error('Error incrementing share:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar el share',
      error: error.message
    });
  }
};
// @desc    Obtener mascotas a las que el usuario ha dado like
// @route   GET /api/v1/pets/liked
// @access  Private
const getLikedPets = async (req, res) => {
  try {
    console.log('💖 Obteniendo mascotas con like del usuario:', req.user.name);

    const userId = req.user._id;

    // MÉTODO 1: Buscar en Pet.likes (más eficiente)
    // Encuentra todas las mascotas donde el userId está en el array de likes
    const likedPets = await Pet.find({
      'likes.userId': userId
    })
      .sort({ 'likes.createdAt': -1 }) // Ordenar por fecha de like (más reciente primero)
      .lean(); // Convertir a objeto plano para mejor performance

    console.log(`📊 Se encontraron ${likedPets.length} mascotas con like`);

    // Agregar isLiked = true a todas (obviamente, ya que las buscamos por like)
    const petsWithLikes = likedPets.map(pet => {
      // Calcular contadores usando los arrays
      const likesCount = pet.likes ? pet.likes.length : 0;
      const commentsCount = pet.comments ? pet.comments.length : 0;

      return {
        ...pet,
        isLiked: true, // Siempre true porque las filtramos por like
        likesCount,
        commentsCount
      };
    });

    res.status(200).json({
      success: true,
      data: {
        pets: petsWithLikes,
        total: petsWithLikes.length
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo mascotas con like:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener mascotas con like',
      error: error.message
    });
  }
};

// ============================================
// ACTUALIZAR EL module.exports AL FINAL
// ============================================
module.exports = {
  getPets,
  getPopularPets,
  getPetById,
  createPet,
  updatePet,
  deletePet,
  toggleLikePet,      // ✅ Ya existía, ahora mejorado
  // toggleFavoritePet,
  // getMyPets,
  // searchPets,
  createComment,      // ✅ NUEVO
  getComments,        // ✅ NUEVO
  incrementShare, 
  getLikedPets     // ✅ NUEVO
};