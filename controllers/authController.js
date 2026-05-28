// controllers/authController.js
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { ROLES } = require('../models/user');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const crypto = require('crypto');
const sendEmail = require('../utils/email');

// Función para crear y enviar JWT
const signToken = (id, role) => {
  return jwt.sign({
    id,
    role
  }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '90d',
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id, user.role);

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
    role: role || ROLES.USER,
    phone,
    location
  };

  // Si es refugio, agregar nombre de organización
  if (role === ROLES.SHELTER_COORDINATOR) {
    if (!organizationName) {
      return next(new AppError('El nombre de la organización es requerido para refugios', 400));
    }
    userData.organizationName = organizationName;
  }

  const newUser = await User.create(userData);

  // ============================================
  // ENVIAR CÓDIGO DE VERIFICACIÓN AUTOMÁTICAMENTE
  // ============================================

  // Generar código de 6 dígitos
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

  // Guardar código hasheado
  newUser.verificationCode = crypto
    .createHash('sha256')
    .update(verificationCode)
    .digest('hex');

  newUser.verificationCodeExpires = Date.now() + 10 * 60 * 1000; // 10 minutos

  await newUser.save({ validateBeforeSave: false });

  console.log('✅ Usuario guardado con código de verificación');

  // ⚡ RESPONDER INMEDIATAMENTE AL CLIENTE
  // NO esperamos el email para responder
  createSendToken(newUser, 201, res);

  // ============================================
  // 🚀 ENVIAR EMAIL EN BACKGROUND (sin await)
  // ============================================
  sendEmail({
    email: newUser.email,
    subject: 'Bienvenido a WooHeart - Verifica tu email',
    message: `Hola ${newUser.name}, bienvenido a WooHeart!\n\nTu código de verificación es: ${verificationCode}\n\nEste código expira en 10 minutos.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #FE8043;">¡Bienvenido a WooHeart! 🐾</h2>
        <p>Hola <strong>${newUser.name}</strong>,</p>
        <p>Gracias por registrarte en WooHeart. Para completar tu registro, verifica tu email con el siguiente código:</p>
        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2A1617; border-radius: 8px; margin: 20px 0;">
          ${verificationCode}
        </div>
        <p>Este código expirará en <strong>10 minutos</strong>.</p>
        <p>Si no te registraste en WooHeart, ignora este email.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #999; font-size: 12px;">WooHeart - Conectando corazones con mascotas</p>
      </div>
    `
  })
    .then(() => {
      console.log('✅ [ASYNC] Email de verificación enviado exitosamente a:', newUser.email);
    })
    .catch((err) => {
      console.error('❌ [ASYNC] Error enviando email de verificación:', err);
      // El email falló, pero el usuario ya fue creado y la respuesta enviada
    });
});

// ← AQUÍ TERMINA register, continúa con exports.login

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

  // 4) Verificar si el email está verificado
  if (!user.isVerified) {
    return next(new AppError('Por favor verifica tu email antes de iniciar sesión', 401));
  }

  // 5) Si todo está bien, enviar token al cliente
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
  if (decoded.role && decoded.role !== currentUser.role) {
    return next(
      new AppError('Tu rol ha cambiado. Por favor inicia sesión nuevamente.', 401)
    );
  }
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
// MIDDLEWARES ESPECÍFICOS POR ROL
exports.adminOnly = exports.restrictTo(ROLES.ADMIN);

exports.shelterCoordinatorOrAdmin = exports.restrictTo(
  ROLES.SHELTER_COORDINATOR,
  ROLES.ADMIN
);

exports.authenticatedUsers = exports.restrictTo(
  ROLES.USER,
  ROLES.SHELTER_COORDINATOR,
  ROLES.ADMIN
);

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError('Por favor proporciona un email', 400));
  }

  // 1) Buscar usuario
  const user = await User.findOne({ email });

  if (!user) {
    return next(new AppError('No existe usuario con ese email', 404));
  }

  // 2) Generar código de 6 dígitos
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

  // 3) Guardar código hasheado y expiración (10 minutos)
  user.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetCode)
    .digest('hex');

  user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutos

  await user.save({ validateBeforeSave: false });

  console.log('✅ Código de recuperación generado para:', user.email);

  // 4) Enviar email
  try {
    await sendEmail({
      email: user.email,
      subject: 'Recuperación de contraseña - WooHeart',
      message: `Hola ${user.name},\n\nRecibimos una solicitud para restablecer tu contraseña.\n\nTu código de verificación es: ${resetCode}\n\nEste código expira en 10 minutos.\n\nSi no solicitaste este código, ignora este email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #FE8043;">Recuperación de contraseña - WooHeart 🔒</h2>
          <p>Hola <strong>${user.name}</strong>,</p>
          <p>Recibimos una solicitud para restablecer tu contraseña.</p>
          <p>Tu código de verificación es:</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2A1617; border-radius: 8px; margin: 20px 0;">
            ${resetCode}
          </div>
          <p>Este código expirará en <strong>10 minutos</strong>.</p>
          <p style="color: #B42C1C; font-weight: bold;">⚠️ Si no solicitaste este código, ignora este email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #999; font-size: 12px;">WooHeart - Conectando corazones con mascotas</p>
        </div>
      `
    });

    console.log('✅ Email de recuperación enviado a:', user.email);

    res.status(200).json({
      status: 'success',
      message: 'Código de recuperación enviado al email'
    });

  } catch (err) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save({ validateBeforeSave: false });

    console.error('❌ Error enviando email de recuperación:', err);
    return next(
      new AppError('Error enviando el email. Intenta de nuevo más tarde.', 500)
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const { email, code, newPassword } = req.body;

  // 1) Validar que se enviaron todos los campos
  if (!email || !code || !newPassword) {
    return next(new AppError('Por favor proporciona email, código y nueva contraseña', 400));
  }

  // 2) Validar longitud de contraseña
  if (newPassword.length < 6) {
    return next(new AppError('La contraseña debe tener al menos 6 caracteres', 400));
  }

  // 3) Hashear el código proporcionado
  const hashedCode = crypto
    .createHash('sha256')
    .update(code)
    .digest('hex');

  // 4) Buscar usuario con código válido y no expirado
  const user = await User.findOne({
    email,
    resetPasswordToken: hashedCode,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    return next(new AppError('Código inválido o expirado', 400));
  }

  // 5) Actualizar contraseña y limpiar campos de reset
  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;

  await user.save(); // El middleware pre-save hasheará la contraseña

  console.log('✅ Contraseña actualizada para:', user.email);

  // 6) Enviar respuesta (SIN TOKEN - el usuario debe hacer login)
  res.status(200).json({
    status: 'success',
    message: 'Contraseña actualizada exitosamente. Por favor inicia sesión con tu nueva contraseña.'
  });
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

// ============================================
// VERIFICACIÓN DE EMAIL
// ============================================

exports.sendVerificationCode = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError('Por favor proporciona un email', 400));
  }

  // Buscar usuario
  const user = await User.findOne({ email });

  if (!user) {
    return next(new AppError('No existe usuario con ese email', 404));
  }

  // Si ya está verificado
  if (user.isVerified) {
    return res.status(200).json({
      status: 'success',
      message: 'El email ya está verificado'
    });
  }

  // Generar código de 6 dígitos
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

  // Guardar código hasheado y expiración (10 minutos)
  user.verificationCode = crypto
    .createHash('sha256')
    .update(verificationCode)
    .digest('hex');

  user.verificationCodeExpires = Date.now() + 10 * 60 * 1000; // 10 minutos

  await user.save({ validateBeforeSave: false });

  // Enviar email
  try {
    await sendEmail({
      email: user.email,
      subject: 'Código de verificación - WooHeart',
      message: `Tu código de verificación es: ${verificationCode}\n\nEste código expira en 10 minutos.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #FE8043;">Verificación de Email - WooHeart</h2>
          <p>Hola <strong>${user.name}</strong>,</p>
          <p>Tu código de verificación es:</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2A1617; border-radius: 8px; margin: 20px 0;">
            ${verificationCode}
          </div>
          <p>Este código expirará en <strong>10 minutos</strong>.</p>
          <p>Si no solicitaste este código, ignora este email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #999; font-size: 12px;">WooHeart - Conectando corazones con mascotas</p>
        </div>
      `
    });

    res.status(200).json({
      status: 'success',
      message: 'Código de verificación enviado al email'
    });
  } catch (err) {
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save({ validateBeforeSave: false });

    console.error('Error enviando email:', err);
    return next(
      new AppError('Error enviando el email. Intenta de nuevo más tarde.', 500)
    );
  }
});

exports.verifyEmail = catchAsync(async (req, res, next) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return next(new AppError('Por favor proporciona email y código', 400));
  }

  // Hashear el código proporcionado
  const hashedCode = crypto
    .createHash('sha256')
    .update(code)
    .digest('hex');

  // Buscar usuario con código válido y no expirado
  const user = await User.findOne({
    email,
    verificationCode: hashedCode,
    verificationCodeExpires: { $gt: Date.now() }
  });

  if (!user) {
    return next(new AppError('Código inválido o expirado', 400));
  }

  // Marcar como verificado y limpiar código
  user.isVerified = true;
  user.verificationCode = undefined;
  user.verificationCodeExpires = undefined;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: 'Email verificado exitosamente',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified
      }
    }
  });
});
// ============================================
// MIDDLEWARE DE AUTENTICACIÓN OPCIONAL
// ============================================
exports.optionalAuth = async (req, res, next) => {
  try {
    let token;

    // Intentar obtener token del header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Si no hay token, continuar sin usuario
    if (!token) {
      console.log('⚠️ No hay token - continuando sin autenticación');
      req.user = null;
      return next();
    }

    // Si hay token, intentar verificarlo
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const currentUser = await User.findById(decoded.id);

      if (!currentUser) {
        console.log('⚠️ Token válido pero usuario no existe');
        req.user = null;
        return next();
      }

      // Usuario autenticado correctamente
      console.log('✅ Usuario autenticado:', currentUser.name);
      req.user = currentUser;
      next();
    } catch (error) {
      // Token inválido o expirado - continuar sin usuario
      console.log('⚠️ Token inválido - continuando sin autenticación');
      req.user = null;
      next();
    }
  } catch (error) {
    console.error('Error en optionalAuth:', error);
    req.user = null;
    next();
  }
};