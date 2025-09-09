// test-db.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

console.log('🔍 Probando conexión a MongoDB...');
console.log('DATABASE_URI:', process.env.DATABASE_URI ? 'Configurado ✅' : 'No configurado ❌');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.DATABASE_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log('🎉 Conexión exitosa! Cerrando...');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

connectDB();