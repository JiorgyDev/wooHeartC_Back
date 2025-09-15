// check-env.js
require('dotenv').config();

console.log('🔍 VERIFICANDO VARIABLES DE ENTORNO:');
console.log('================================');
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME || 'FALTA');
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY || 'FALTA');
console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'CONFIGURADO' : 'FALTA');
console.log('MONGODB_URI:', process.env.MONGODB_URI || 'FALTA');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');