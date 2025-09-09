// test-auth.js
const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

console.log('🔍 Probando solo auth route...');

const app = express();
app.use(express.json());

// Ruta básica primero
app.get('/api/v1/health', (req, res) => {
  res.json({ message: 'Health OK' });
});

// Intentar cargar auth route
try {
  console.log('📁 Intentando cargar routes/auth.js...');
  const authRoutes = require('./routes/auth');
  app.use('/api/v1/auth', authRoutes);
  console.log('✅ Auth routes cargadas correctamente');
} catch (error) {
  console.log('❌ Error cargando auth routes:', error.message);
  console.log('📍 Archivo problemático:', error.stack);
}

const port = 5000;
app.listen(port, () => {
  console.log(`🚀 Servidor test-auth corriendo en puerto ${port}`);
});