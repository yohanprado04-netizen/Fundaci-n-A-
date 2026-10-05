import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fundacion_alertas';

export async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`[MongoDB] Conectado exitosamente a: ${MONGODB_URI}`);
  } catch (error) {
    console.error('[MongoDB] Error conectando a la base de datos:', error.message);
    process.exit(1);
  }
}
