const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

// Configurar Cloudinary directamente aquí
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log("☁️ Cloudinary configurado:", {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? "OK" : "FALTA",
  api_key: process.env.CLOUDINARY_API_KEY ? "OK" : "FALTA",
  api_secret: process.env.CLOUDINARY_API_SECRET ? "OK" : "FALTA",
});

// Crear storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "wooheart/pets",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

console.log("📁 Storage de Cloudinary configurado para folder: wooheart/pets");

// Crear multer para UNA imagen (compatibilidad)
const uploadPetImage = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    console.log(
      "🔍 Validando archivo:",
      file.originalname,
      "Tipo:",
      file.mimetype
    );
    if (file.mimetype.startsWith("image/")) {
      console.log("✅ Archivo válido");
      cb(null, true);
    } else {
      console.log("❌ Archivo inválido");
      cb(new Error("Solo se permiten archivos de imagen"), false);
    }
  },
});

// Crear multer para MÚLTIPLES imágenes
const uploadPetImages = multer({
  storage: storage,
  limits: { 
    fileSize: 5 * 1024 * 1024, // 5MB por archivo
    files: 5 // máximo 5 archivos
  },
  fileFilter: (req, file, cb) => {
    console.log(
      "🔍 Validando archivo múltiple:",
      file.originalname,
      "Tipo:",
      file.mimetype
    );
    if (file.mimetype.startsWith("image/")) {
      console.log("✅ Archivo válido");
      cb(null, true);
    } else {
      console.log("❌ Archivo inválido");
      cb(new Error("Solo se permiten archivos de imagen"), false);
    }
  },
});

const handleUploadError = (err, req, res, next) => {
  console.log("🚨 Error en upload:", err.message);
  if (err.code === "LIMIT_FILE_SIZE") {
    console.log("📏 Error: Archivo demasiado grande");
    return res.status(400).json({
      success: false,
      message: "El archivo es demasiado grande. Máximo 5MB.",
    });
  }
  if (err.code === "LIMIT_FILE_COUNT") {
    console.log("📏 Error: Demasiados archivos");
    return res.status(400).json({
      success: false,
      message: "Máximo 5 imágenes permitidas.",
    });
  }
  next(err);
};

// Procesar UNA imagen (compatibilidad)
const processUploadedImage = (req, res, next) => {
  console.log("🔄 Procesando imagen subida...");
  if (req.file) {
    console.log("✅ Imagen encontrada:", req.file.path);
    req.body.imageUrl = req.file.path;
    req.body.imagePublicId = req.file.filename;
  } else {
    console.log("❌ No se encontró imagen en req.file");
  }
  next();
};

// Procesar MÚLTIPLES imágenes
const processUploadedImages = (req, res, next) => {
  console.log("🔄 Procesando múltiples imágenes...");
  if (req.files && req.files.length > 0) {
    console.log(`✅ ${req.files.length} imágenes encontradas`);
    
    // Crear arrays para URLs y public IDs
    req.body.imageUrls = req.files.map(file => file.path);
    req.body.imagePublicIds = req.files.map(file => file.filename);
    
    // Mantener compatibilidad con imagen individual
    req.body.imageUrl = req.files[0].path;
    req.body.imagePublicId = req.files[0].filename;
    
    console.log("📸 URLs de imágenes:", req.body.imageUrls);
  } else {
    console.log("❌ No se encontraron imágenes en req.files");
    req.body.imageUrls = [];
    req.body.imagePublicIds = [];
  }
  next();
};

module.exports = {
  uploadPetImage,    // Para una imagen (compatibilidad)
  uploadPetImages,   // Para múltiples imágenes
  handleUploadError,
  processUploadedImage,  // Para una imagen (compatibilidad)
  processUploadedImages, // Para múltiples imágenes
};