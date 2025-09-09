// test-app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');

dotenv.config();

console.log('🔍 Probando app básico...');

const app = express();

// Middlewares básicos
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(helmet({
  crossOriginEmbedderPolicy: false
}));

app.use(express.json({ limit: '10kb' }));

// Ruta simple
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'WooHeart API funcionando! 🐾'
  });
});

// Iniciar servidor
const port = 5000;
app.listen(port, () => {
  console.log(`✅ App básico corriendo en puerto ${port}`);
  console.log(`🌐 Prueba: http://localhost:${port}/api/v1/health`);
});