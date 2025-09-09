// test-users.js
const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

console.log('🔍 Probando solo users route...');

const app = express();
app.use(express.json());

app.get('/api/v1/health', (req, res) => {
  res.json({ message: 'Health OK' });
});

try {
  console.log('📁 Intentando cargar routes/users.js...');
  const userRoutes = require('./routes/users');
  app.use('/api/v1/users', userRoutes);
  console.log('✅ Users routes cargadas correctamente');
} catch (error) {
  console.log('❌ Error cargando users routes:', error.message);
  console.log('📍 Stack trace:', error.stack);
}

const port = 5000;
app.listen(port, () => {
  console.log(`🚀 Servidor test-users corriendo en puerto ${port}`);
});