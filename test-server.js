// test-server.js
const express = require('express');
const dotenv = require('dotenv');

console.log('🚀 Iniciando servidor de prueba...');

dotenv.config();

const app = express();
app.use(express.json());

app.get('/test', (req, res) => {
  res.json({ 
    message: '✅ Server funcionando correctamente!',
    timestamp: new Date().toISOString()
  });
});

const port = 5000;
app.listen(port, () => {
  console.log(`✅ Test server corriendo en puerto ${port}`);
  console.log(`🌐 Abre: http://localhost:${port}/test`);
});