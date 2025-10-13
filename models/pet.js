// models/Pet.js
const mongoose = require("mongoose");

const petSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "El nombre de la mascota es requerido"],
      trim: true,
      maxlength: [50, "El nombre no puede exceder 50 caracteres"],
    },
    species: {
      type: String,
      required: [true, "La especie es requerida"],
      enum: {
        values: ["dog", "cat", "bird", "rabbit", "other"],
        message: "La especie debe ser: dog, cat, bird, rabbit u other",
      },
    },
    breed: {
      type: String,
      required: false, // ← CAMBIO: Ahora es opcional
      trim: true,
      default: "Sin especificar", // ← CAMBIO: Valor por defecto
      maxlength: [30, "La raza no puede exceder 30 caracteres"],
    },
    age: {
      type: Number,
      required: [true, "La edad es requerida"],
      min: [0, "La edad no puede ser negativa"],
      max: [50, "La edad no puede exceder 50 años"],
    },
    description: {
      type: String,
      required: [true, "La descripción es requerida"],
      trim: true,
      maxlength: [500, "La descripción no puede exceder 500 caracteres"],
    },
    adoptionStatus: {
      type: String,
      enum: {
        values: ["available", "pending", "adopted", "hidden"], // ← Agregamos 'hidden'
        message: "El estado debe ser: available, pending, adopted o hidden",
      },
      default: "available",
    },
    // CAMPOS PARA MÚLTIPLES IMÁGENES DE CLOUDINARY
    imageUrls: {
      type: [String],
      default: [],
    },
    imagePublicIds: {
      type: [String],
      default: [],
    },
    // CAMPOS PARA UNA IMAGEN (COMPATIBILIDAD)
    imageUrl: {
      type: String,
      default: null,
    },
    imagePublicId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true, // Agrega createdAt y updatedAt automáticamente
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Índices para optimizar búsquedas
petSchema.index({ species: 1, adoptionStatus: 1 });
petSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Pet", petSchema);
