import mongoose from 'mongoose';

const StudentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  program: {
    type: String,
    default: 'Estudiante de Programación'
  },
  avatar: {
    type: String,
    default: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop&crop=faces'
  },
  riskLevel: {
    type: String,
    enum: ['Alto', 'Medio', 'Bajo'],
    default: 'Bajo'
  },
  gpa: {
    type: Number,
    required: true,
    min: 0,
    max: 5.0
  },
  attendancePercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  totalAbsences: {
    type: Number,
    default: 0
  },
  consecutiveAbsences: {
    type: Number,
    default: 0
  },
  monthlyGrades: {
    type: [Number],
    default: [4.0, 3.8, 3.4, 3.0, 2.7]
  },
  monthlyAttendance: {
    type: [Number],
    default: [95, 90, 85, 78, 71]
  },
  activeAlerts: [
    {
      title: String,
      description: String,
      severity: {
        type: String,
        enum: ['rose', 'amber', 'emerald'],
        default: 'rose'
      }
    }
  ],
  recommendation: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const Student = mongoose.model('Student', StudentSchema);
