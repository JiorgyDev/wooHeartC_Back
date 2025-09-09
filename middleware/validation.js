// middleware/validation.js
const AppError = require('../utils/appError');

exports.validateRegister = (req, res, next) => {
  const { name, email, password, role } = req.body;
  
  // Validaciones básicas
  if (!name || name.trim().length < 2) {
    return next(new AppError('El nombre debe tener al menos 2 caracteres', 400));
  }
  
  if (!email || !isValidEmail(email)) {
    return next(new AppError('Por favor proporciona un email válido', 400));
  }
  
  if (!password || password.length < 6) {
    return next(new AppError('La contraseña debe tener al menos 6 caracteres', 400));
  }
  
  // Validar password strength
  if (!isStrongPassword(password)) {
    return next(new AppError('La contraseña debe contener al menos una letra mayúscula, una minúscula y un número', 400));
  }
  
  // Validar role si se proporciona
  const validRoles = ['user', 'shelter', 'admin'];
  if (role && !validRoles.includes(role)) {
    return next(new AppError('Rol inválido', 400));
  }
  
  // Si es refugio, validar organización
  if (role === 'shelter' && !req.body.organizationName) {
    return next(new AppError('El nombre de la organización es requerido para refugios', 400));
  }
  
  next();
};

exports.validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return next(new AppError('Email y contraseña son requeridos', 400));
  }
  
  if (!isValidEmail(email)) {
    return next(new AppError('Por favor proporciona un email válido', 400));
  }
  
  next();
};

exports.validatePet = (req, res, next) => {
  const { 
    name, 
    species, 
    breed, 
    age, 
    gender, 
    size, 
    color, 
    description, 
    location 
  } = req.body;
  
  // Validaciones requeridas
  const requiredFields = {
    name: 'El nombre de la mascota es requerido',
    species: 'La especie es requerida',
    breed: 'La raza es requerida',
    gender: 'El género es requerido',
    size: 'El tamaño es requerido',
    color: 'El color es requerido',
    description: 'La descripción es requerida'
  };
  
  for (const [field, message] of Object.entries(requiredFields)) {
    if (!req.body[field] || req.body[field].toString().trim() === '') {
      return next(new AppError(message, 400));
    }
  }
  
  // Validar edad
  if (!age || !age.value || !age.unit || !age.category) {
    return next(new AppError('La información de edad completa es requerida', 400));
  }
  
  if (age.value < 0) {
    return next(new AppError('La edad no puede ser negativa', 400));
  }
  
  // Validar ubicación
  if (!location || !location.address || !location.city || !location.state) {
    return next(new AppError('La información de ubicación completa es requerida', 400));
  }
  
  // Validar descripción
  if (description.length < 20) {
    return next(new AppError('La descripción debe tener al menos 20 caracteres', 400));
  }
  
  if (description.length > 1000) {
    return next(new AppError('La descripción no puede exceder 1000 caracteres', 400));
  }
  
  // Validar especies permitidas
  const validSpecies = ['dog', 'cat', 'bird', 'rabbit', 'hamster', 'fish', 'reptile', 'other'];
  if (!validSpecies.includes(species.toLowerCase())) {
    return next(new AppError('Especie no válida', 400));
  }
  
  // Validar género
  const validGenders = ['male', 'female', 'unknown'];
  if (!validGenders.includes(gender.toLowerCase())) {
    return next(new AppError('Género no válido', 400));
  }
  
  // Validar tamaño
  const validSizes = ['small', 'medium', 'large'];
  if (!validSizes.includes(size.toLowerCase())) {
    return next(new AppError('Tamaño no válido', 400));
  }
  
  // Validar unidad de edad
  const validAgeUnits = ['months', 'years'];
  if (!validAgeUnits.includes(age.unit.toLowerCase())) {
    return next(new AppError('Unidad de edad no válida', 400));
  }
  
  // Validar categoría de edad
  const validAgeCategories = ['young', 'adult', 'senior'];
  if (!validAgeCategories.includes(age.category.toLowerCase())) {
    return next(new AppError('Categoría de edad no válida', 400));
  }
  
  next();
};

// Funciones auxiliares
function isValidEmail(email) {
  const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  return emailRegex.test(email);
}

function isStrongPassword(password) {
  // Al menos una mayúscula, una minúscula y un número
  const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
  return strongRegex.test(password);
}