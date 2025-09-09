const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configurar Cloudinary directamente aquí
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Crear storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'wooheart/pets',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp']
  }
});

// Crear multer
const uploadPetImage = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'), false);
    }
  }
});

const handleUploadError = (err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'El archivo es demasiado grande. Máximo 5MB.'
    });
  }
  next(err);
};

const processUploadedImage = (req, res, next) => {
  if (req.file) {
    req.body.imageUrl = req.file.path;
    req.body.imagePublicId = req.file.filename;
  }
  next();
};

module.exports = {
  uploadPetImage,
  handleUploadError,
  processUploadedImage
};