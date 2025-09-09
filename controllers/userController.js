// controllers/userController.js
const User = require('../models/user');
const Pet = require('../models/pet');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const cloudinary = require('../config/cloudinary');

// Función para filtrar campos permitidos
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).populate('favorites');
  
  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Crear error si el usuario trata de actualizar contraseña
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'Esta ruta no es para actualizar contraseñas. Por favor usa /update-password.',
        400
      )
    );
  }

  // 2) Filtrar campos que no deben actualizarse
  const filteredBody = filterObj(
    req.body,
    'name',
    'bio',
    'location',
    'phone',
    'organizationName',
    'adoptionPreferences',
    'notifications'
  );

  // 3) Actualizar documento del usuario
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
});

exports.updateAvatar = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Por favor sube una imagen', 400));
  }

  const user = await User.findById(req.user.id);

  // Eliminar avatar anterior de Cloudinary si no es el default
  if (user.avatar && !user.avatar.includes('default-avatar')) {
    const publicId = user.avatar.split('/').pop().split('.')[0];
    await cloudinary.uploader.destroy(`wooheart/avatars/${publicId}`);
  }

  // Subir nueva imagen
  const result = await cloudinary.uploader.upload(req.file.path, {
    folder: 'wooheart/avatars',
    width: 300,
    height: 300,
    crop: 'fill'
  });

  // Actualizar usuario
  user.avatar = result.secure_url;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    data: {
      avatar: result.secure_url
    }
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  // En lugar de eliminar, desactivar la cuenta
  await User.findByIdAndUpdate(req.user.id, { 
    isActive: false,
    email: `deleted_${Date.now()}_${req.user.email}` // Para permitir reutilizar el email
  });

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.getUserProfile = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    return next(new AppError('Usuario no encontrado', 404));
  }

  // Obtener mascotas del usuario
  const pets = await Pet.find({ 
    postedBy: req.params.id,
    isActive: true 
  })
  .sort({ createdAt: -1 })
  .limit(12);

  res.status(200).json({
    status: 'success',
    data: {
      user,
      pets,
      petsCount: pets.length
    }
  });
});

exports.getUserStats = catchAsync(async (req, res, next) => {
  const userId = req.params.id || req.user.id;
  
  const stats = await Pet.aggregate([
    { $match: { postedBy: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalPets: { $sum: 1 },
        totalViews: { $sum: '$stats.views' },
        totalLikes: { $sum: '$stats.likes' },
        totalShares: { $sum: '$stats.shares' },
        adopted: {
          $sum: {
            $cond: [{ $eq: ['$adoption.status', 'adopted'] }, 1, 0]
          }
        }
      }
    }
  ]);

  const userStats = stats[0] || {
    totalPets: 0,
    totalViews: 0,
    totalLikes: 0,
    totalShares: 0,
    adopted: 0
  };

  res.status(200).json({
    status: 'success',
    data: {
      stats: userStats
    }
  });
});

exports.addToFavorites = catchAsync(async (req, res, next) => {
  const { petId } = req.params;
  
  const user = await User.findById(req.user.id);
  const pet = await Pet.findById(petId);
  
  if (!pet) {
    return next(new AppError('Mascota no encontrada', 404));
  }

  // Verificar si ya está en favoritos
  if (user.favorites.includes(petId)) {
    return next(new AppError('La mascota ya está en favoritos', 400));
  }

  user.favorites.push(petId);
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: 'Mascota agregada a favoritos'
  });
});

exports.removeFromFavorites = catchAsync(async (req, res, next) => {
  const { petId } = req.params;
  
  const user = await User.findById(req.user.id);
  
  const index = user.favorites.indexOf(petId);
  if (index === -1) {
    return next(new AppError('La mascota no está en favoritos', 400));
  }

  user.favorites.splice(index, 1);
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: 'Mascota removida de favoritos'
  });
});

exports.getFavorites = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).populate({
    path: 'favorites',
    match: { isActive: true },
    populate: {
      path: 'postedBy',
      select: 'name avatar organizationName'
    }
  });

  res.status(200).json({
    status: 'success',
    data: {
      favorites: user.favorites
    }
  });
});

// Admin functions
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find().sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users
    }
  });
});

exports.getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('Usuario no encontrado', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'Esta ruta no está definida. Por favor usa /register'
  });
};

exports.updateUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!user) {
    return next(new AppError('Usuario no encontrado', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});

exports.deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    return next(new AppError('Usuario no encontrado', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});