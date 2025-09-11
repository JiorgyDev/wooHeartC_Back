// controllers/authController.js
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const crypto = require('crypto');

// Función para crear y enviar JWT
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '90d',
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  
  const cookieOptions = {
    expires: new Date(
      Date.now() + (process.env.JWT_COOKIE_EXPIRES_IN || 90) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  res.cookie('jwt', token, cookieOptions);

  // Eliminar password del output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

exports.register = catchAsync(async (req, res, next) => {
  const { name, email, password, role, organizationName, phone, location } = req.body;

  // Verificar si el email ya existe
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('El email ya está registrado', 400));
  }

  // Crear nuevo usuario
  const userData = {
    name,
    email,
    password,
    role: role || 'user',
    phone,
    location
  };

  // Si es refugio, agregar nombre de organización
  if (role === 'shelter') {
    if (!organizationName) {
      return next(new AppError('El nombre de la organización es requerido para refugios', 400));
    }
    userData.organizationName = organizationName;
  }

  const newUser = await User.create(userData);

  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Verificar que email y password existen
  if (!email || !password) {
    return next(new AppError('Por favor proporciona email y contraseña', 400));
  }

  // 2) Verificar si el usuario existe y la contraseña es correcta
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError('Email o contraseña incorrectos', 401));
  }

  // 3) Actualizar última actividad
  user.lastActive = new Date();
  await user.save({ validateBeforeSave: false });

  // 4) Si todo está bien, enviar token al cliente
  createSendToken(user, 200, res);
});

// NUEVA FUNCIÓN: Obtener datos del usuario autenticado
exports.getMe = catchAsync(async (req, res, next) => {
  // El middleware protect ya debe haber agregado el usuario a req.user
  if (!req.user) {
    return next(new AppError('Usuario no autenticado', 401));
  }

  // Buscar el usuario en la base de datos con información completa
  const user = await User.findById(req.user.id);
  
  if (!user) {
    return next(new AppError('Usuario no encontrado', 404));
  }

  // Eliminar password del output
  user.password = undefined;

  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  
  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Obtener token y verificar que existe
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('No tienes acceso. Por favor inicia sesión.', 401)
    );
  }

  // 2) Verificar token
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // 3) Verificar si el usuario aún existe
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError('El usuario propietario de este token ya no existe.', 401)
    );
  }

  // 4) Verificar si el usuario cambió la contraseña después de que se emitió el token
  // (implementar según necesidades)

  // Otorgar acceso a la ruta protegida
  req.user = currentUser;
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('No tienes permisos para realizar esta acción', 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Obtener usuario basado en email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('No existe usuario con ese email', 404));
  }

  // 2) Generar token random
  const resetToken = crypto.randomBytes(32).toString('hex');

  user.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutos

  await user.save({ validateBeforeSave: false });

  // 3) Enviar por email (implementar según servicio de email)
  try {
    // TODO: Implementar envío de email
    // await sendEmail({
    //   email: user.email,
    //   subject: 'Token de recuperación de contraseña (válido por 10 min)',
    //   message: resetToken
    // });

    res.status(200).json({
      status: 'success',
      message: 'Token enviado al email',
      // En desarrollo, devolver el token
      ...(process.env.NODE_ENV === 'development' && { resetToken })
    });
  } catch (err) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('Error enviando el email. Intenta de nuevo más tarde.', 500)
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Obtener usuario basado en el token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() }
  });

  // 2) Si el token no ha expirado y hay usuario, establecer nueva contraseña
  if (!user) {
    return next(new AppError('Token inválido o expirado', 400));
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  // 3) Actualizar changedPasswordAt property (implementar en el modelo si es necesario)

  // 4) Log in del usuario, enviar JWT
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Obtener usuario de la colección
  const user = await User.findById(req.user.id).select('+password');

  // 2) Verificar si la contraseña actual es correcta
  if (!(await user.comparePassword(req.body.currentPassword))) {
    return next(new AppError('La contraseña actual es incorrecta', 401));
  }

  // 3) Si es así, actualizar contraseña
  user.password = req.body.password;
  await user.save();

  // 4) Log in del usuario, enviar JWT
  createSendToken(user, 200, res);
});

// Middleware para verificar si está logueado (no obligatorio)
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1) Verificar token
      const decoded = jwt.verify(req.cookies.jwt, process.env.JWT_SECRET);

      // 2) Verificar si el usuario aún existe
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // Hay un usuario logueado
      req.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};