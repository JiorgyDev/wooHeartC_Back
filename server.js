// server.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Manejar excepciones no capturadas
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

// Cargar variables de entorno
dotenv.config();

const app = require('./app');

// Conectar a MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.DATABASE_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
};

// Conectar a la base de datos
connectDB();

// Iniciar servidor
const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
  console.log(`🚀 WooHeart Backend running on port ${port}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV}`);
  console.log(`🌐 API URL: http://localhost:${port}/api/v1`);
});

// Manejar rechazos de promesas no manejados
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});