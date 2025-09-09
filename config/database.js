const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB Atlas');
  } catch (error) {
    console.log('Error conectando a MongoDB:', error);
    process.exit(1);
  }
};

module.exports = connectDB;