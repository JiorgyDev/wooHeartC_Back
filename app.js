// app.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

// Importar middleware de manejo de errores
const globalErrorHandler = require("./middleware/errorHandler");
const AppError = require("./utils/appError");

const app = express();

app.set('trust proxy', 1);

// 1) MIDDLEWARES GLOBALES

// Implementar CORS
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://woo-heart-c-front-iakf.vercel.app",
    ],
    credentials: true,
  })
);

// Helmet para headers de seguridad
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
  })
);

// Rate limiting
const limiter = rateLimit({
  max: process.env.RATE_LIMIT_MAX || 1000,
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 60 * 60 * 1000, // 1 hora
  message: "Demasiadas peticiones desde esta IP, intenta de nuevo en una hora.",
});
app.use("/api", limiter);

// ⚠️ NUEVO: Webhook de Stripe DEBE estar ANTES de express.json()
// Stripe necesita el body RAW (sin parsear a JSON)
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));

// Body parser middleware
app.use(express.json({ limit: "10mb" })); // Aumentado para imágenes
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Sanitización de datos contra ataques NoSQL query injection
app.use(mongoSanitize());

// Sanitización de datos contra ataques XSS
app.use(xss());

// Prevenir parameter pollution
app.use(
  hpp({
    whitelist: ["species", "size", "age", "location", "type", "gender"],
  })
);

// Compresión
app.use(compression());

// Middleware de logging en desarrollo
if (process.env.NODE_ENV === "development") {
  const morgan = require("morgan");
  app.use(morgan("dev"));
}

// Servir archivos estáticos
app.use(express.static("uploads"));

// 2) RUTAS
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "WooHeart API is running! 🐾",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// Importar rutas DESPUÉS de configurar middlewares
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const petRoutes = require("./routes/pets");
const commentRoutes = require("./routes/comments");
const conversationRoutes = require("./routes/conversations");
const messageRoutes = require("./routes/messages");
const paymentRoutes = require("./routes/payments"); // ← NUEVA LÍNEA

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/pets", petRoutes);
app.use("/api/v1/comments", commentRoutes);
app.use("/api/v1/conversations", conversationRoutes);
app.use("/api/v1/messages", messageRoutes);
app.use("/api/v1/payments", paymentRoutes); // ← NUEVA LÍNEA

// 3) MANEJAR RUTAS NO ENCONTRADAS
app.all("*", (req, res, next) => {
  next(
    new AppError(
      `No se puede encontrar ${req.originalUrl} en este servidor!`,
      404
    )
  );
});

// 4) GLOBAL ERROR HANDLER
app.use(globalErrorHandler);

module.exports = app;