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

// Crear multer
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

const handleUploadError = (err, req, res, next) => {
  console.log("🚨 Error en upload:", err.message);
  if (err.code === "LIMIT_FILE_SIZE") {
    console.log("📏 Error: Archivo demasiado grande");
    return res.status(400).json({
      success: false,
      message: "El archivo es demasiado grande. Máximo 5MB.",
    });
  }
  next(err);
};

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

module.exports = {
  uploadPetImage,
  handleUploadError,
  processUploadedImage,
};
