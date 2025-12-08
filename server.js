// server.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');

// Manejar excepciones no capturadas
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

// Cargar variables de entorno
dotenv.config();

const app = require('./app');

// Crear servidor HTTP
const server = http.createServer(app);

// Configurar Socket.io
const io = socketIo(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://woo-heart-c-front-iakf.vercel.app",
      "*"
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Hacer io accesible en toda la app
app.set('io', io);

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

// Socket.io - Manejo de conexiones
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('🔌 Usuario conectado:', socket.id);

  socket.on('authenticate', (userId) => {
    if (userId) {
      onlineUsers.set(userId, socket.id);
      socket.userId = userId;
      socket.join(userId);
      console.log(`✅ Usuario ${userId} autenticado en socket ${socket.id}`);
      socket.broadcast.emit('user_online', userId);
    }
  });

  socket.on('typing', ({ conversationId, userId }) => {
    socket.to(conversationId).emit('user_typing', { conversationId, userId });
  });

  socket.on('stop_typing', ({ conversationId, userId }) => {
    socket.to(conversationId).emit('user_stop_typing', { conversationId, userId });
  });

  socket.on('join_conversation', (conversationId) => {
    socket.join(conversationId);
    console.log(`Usuario ${socket.userId} se unió a conversación ${conversationId}`);
  });

  socket.on('leave_conversation', (conversationId) => {
    socket.leave(conversationId);
    console.log(`Usuario ${socket.userId} salió de conversación ${conversationId}`);
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      socket.broadcast.emit('user_offline', socket.userId);
      console.log(`❌ Usuario ${socket.userId} desconectado`);
    }
  });
});

// Iniciar servidor
const port = process.env.PORT || 5000;
server.listen(port, () => {
  console.log(`🚀 WooHeart Backend running on port ${port}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV}`);
  console.log(`🌐 API URL: http://localhost:${port}/api/v1`);
  console.log(`🔌 Socket.io ready for connections`);
});

// Manejar rechazos de promesas no manejados
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});