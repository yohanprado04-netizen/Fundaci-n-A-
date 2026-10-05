import mongoose from 'mongoose';

const AlertSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  studentName: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ['Riesgo alto', 'Riesgo medio', 'Bajo riesgo', 'Crítica', 'Información'],
    default: 'Riesgo medio'
  },
  timestamp: {
    type: String,
    default: 'Hoy'
  },
  status: {
    type: String,
    enum: ['Pendiente', 'Vista', 'En proceso', 'Resuelta', 'Descartada'],
    default: 'Pendiente'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const Alert = mongoose.model('Alert', AlertSchema);
