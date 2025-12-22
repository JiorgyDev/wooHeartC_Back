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
      required: false,
      trim: true,
      default: "Sin especificar",
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
      maxlength: [1000, "La descripción no puede exceder 1000 caracteres"],
    },
    adoptionStatus: {
      type: String,
      enum: {
        values: ["available", "pending", "adopted", "hidden"],
        message: "El estado debe ser: available, pending, adopted o hidden",
      },
      default: "available",
    },
    
    // IMÁGENES
    imageUrls: {
      type: [String],
      default: [],
    },
    imagePublicIds: {
      type: [String],
      default: [],
    },
    imageUrl: {
      type: String,
      default: null,
    },
    imagePublicId: {
      type: String,
      default: null,
    },

    // ============================================
    // ✅ NUEVOS CAMPOS PARA LIKES, COMMENTS, SHARES
    // ============================================
    likes: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],

    comments: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      username: {
        type: String,
        required: true
      },
      content: {
        type: String,
        required: true,
        maxlength: 500
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],

    shares: {
      type: Number,
      default: 0,
      min: 0
    },

    adopcion: {
      type: Number,
      default: 0,
      min: 0
    },
    apoyo: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true,
    toJSON: { 
      virtuals: true,
      transform: function(doc, ret) {
        ret.likesCount = ret.likes ? ret.likes.length : 0;
        ret.commentsCount = ret.comments ? ret.comments.length : 0;
        return ret;
      }
    },
    toObject: { virtuals: true },
  }
);

// Índices
petSchema.index({ species: 1, adoptionStatus: 1 });
petSchema.index({ createdAt: -1 });
petSchema.index({ 'likes.userId': 1 });

module.exports = mongoose.model("Pet", petSchema);