// controllers/petController.js
const Pet = require('../models/pet');
const User = require('../models/user');
const { cloudinary } = require('../config/cloudinary');

// @desc    Obtener todas las mascotas disponibles (feed estilo TikTok)
// @route   GET /api/v1/pets
// @access  Public
const getPets = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Filtros opcionales
    const filters = {
      adoptionStatus: 'available'
    };

    if (req.query.species) filters.species = req.query.species;
    if (req.query.breed) filters.breed = new RegExp(req.query.breed, 'i');

    console.log('📋 Obteniendo mascotas con filtros:', filters);
const pets = await Pet.find(filters)
      .sort({ createdAt: -1 }) // Más recientes primero
      .skip(skip)
      .limit(limit)
      .lean();

    const totalPets = await Pet.countDocuments(filters);
console.log(`📊 Se encontraron ${pets.length} mascotas, total: ${totalPets}`);
pets.forEach((pet, i) => {
  console.log(`   ${i+1}. ${pet.name} - Imagen: ${pet.imageUrl ? 'SÍ' : 'NO'}`);
});

    res.status(200).json({
      success: true,
      data: {
        pets,
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
    console.log('🖼️ Archivo recibido:', req.file);
    const {
      name, species, breed, age, description, adoptionStatus
    } = req.body;

    // Crear la mascota con los datos básicos
    const petData = {
      name,
      species,
      breed,
      age,
      description,
      adoptionStatus: adoptionStatus || 'available'
    };

    // AGREGAR IMAGEN DE CLOUDINARY SI EXISTE
if (req.files && req.files.length > 0) {
  // Múltiples imágenes
  petData.imageUrls = req.body.imageUrls;
  petData.imagePublicIds = req.body.imagePublicIds;
  
  // Compatibilidad con imagen individual
  petData.imageUrl = req.body.imageUrl;
  petData.imagePublicId = req.body.imagePublicId;
} else if (req.file) {
  // Una sola imagen (compatibilidad)
  petData.imageUrl = req.file.path;
  petData.imagePublicId = req.file.filename;
}

    console.log('💾 Datos a guardar:', petData);
const pet = await Pet.create(petData);
console.log('✅ Mascota guardada:', { name: pet.name, imageUrl: pet.imageUrl });

    res.status(201).json({
      success: true,
      message: 'Mascota creada exitosamente',
      data: pet
    });

  } catch (error) {
    console.error('Error creating pet:', error);
    // Si hay error y se subió imagen, eliminarla de Cloudinary
    if (req.file && req.file.filename) {
      try {
        await cloudinary.uploader.destroy(req.file.filename);
      } catch (deleteError) {
        console.error('Error deleting image from cloudinary:', deleteError);
      }
    }
    
    res.status(400).json({
      success: false,
      message: 'Error al crear la mascota',
      error: error.message
    });
  }
};

// @desc    Actualizar mascota
// @route   PUT /api/v1/pets/:id
// @access  Private (temporalmente público)
const updatePet = async (req, res) => {
  try {
    let pet = await Pet.findById(req.params.id);

    if (!pet) {
      return res.status(404).json({
        success: false,
        message: 'Mascota no encontrada'
      });
    }

    // Si hay nueva imagen, eliminar la anterior
    if (req.body.imageUrl && pet.imagePublicId) {
      try {
        await cloudinary.uploader.destroy(pet.imagePublicId);
      } catch (deleteError) {
        console.error('Error deleting old image:', deleteError);
      }
    }

    const allowedUpdates = [
      'name', 'species', 'breed', 'age', 'description', 'adoptionStatus'
    ];

    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // AGREGAR NUEVA IMAGEN SI EXISTE
    if (req.files && req.files.length > 0) {
  updates.imageUrls = req.body.imageUrls;
  updates.imagePublicIds = req.body.imagePublicIds;
  updates.imageUrl = req.body.imageUrl;
  updates.imagePublicId = req.body.imagePublicId;
} else if (req.file) {
  updates.imageUrl = req.file.path;
  updates.imagePublicId = req.file.filename;
}

    pet = await Pet.findByIdAndUpdate(req.params.id, updates, { 
      new: true, 
      runValidators: true 
    });

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

    res.status(200).json({
      success: true,
      message: 'Like procesado (funcionalidad simplificada)',
      data: {
        petId: pet._id,
        message: 'Like functionality will be implemented when auth is active'
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

// @desc    Toggle favorito en una mascota (simplificado para desarrollo)
// @route   POST /api/v1/pets/:id/favorite
// @access  Private (temporalmente público)
const toggleFavoritePet = async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id);

    if (!pet) {
      return res.status(404).json({
        success: false,
        message: 'Mascota no encontrada'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Favorito procesado (funcionalidad simplificada)',
      data: {
        petId: pet._id,
        message: 'Favorite functionality will be implemented when auth is active'
      }
    });

  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar favorito',
      error: error.message
    });
  }
};

// @desc    Obtener mascotas del usuario actual (simplificado)
// @route   GET /api/v1/pets/user/my-pets
// @access  Private (temporalmente público)
const getMyPets = async (req, res) => {
  try {
    // Por ahora devolver todas las mascotas
    const pets = await Pet.find({})
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      message: 'Mostrando todas las mascotas (funcionalidad de usuario será implementada con auth)',
      data: pets
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

// @desc    Buscar mascotas
// @route   GET /api/v1/pets/search
// @access  Public
const searchPets = async (req, res) => {
  try {
    const { q, species, breed } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let searchFilter = {
      adoptionStatus: 'available'
    };

    // Búsqueda por texto
    if (q) {
      searchFilter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { breed: { $regex: q, $options: 'i' } }
      ];
    }

    // Filtros adicionales
    if (species) searchFilter.species = species;
    if (breed) searchFilter.breed = new RegExp(breed, 'i');

    const pets = await Pet.find(searchFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalResults = await Pet.countDocuments(searchFilter);

    res.status(200).json({
      success: true,
      data: {
        pets,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalResults / limit),
          totalResults,
          hasNext: page < Math.ceil(totalResults / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error searching pets:', error);
    res.status(500).json({
      success: false,
      message: 'Error en la búsqueda',
      error: error.message
    });
  }
};

module.exports = {
  getPets,
  getPopularPets,
  getPetById,
  createPet,
  updatePet,
  deletePet,
  toggleLikePet,
  toggleFavoritePet,
  getMyPets,
  searchPets
};