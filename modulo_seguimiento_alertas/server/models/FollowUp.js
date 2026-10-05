import mongoose from 'mongoose';

const FollowUpSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  studentName: {
    type: String,
    required: true
  },
  teacherName: {
    type: String,
    required: true
  },
  interventionType: {
    type: String,
    required: true
  },
  newStatus: {
    type: String,
    enum: ['En proceso', 'Resuelta', 'Descartada'],
    default: 'En proceso'
  },
  nextFollowupDate: {
    type: String,
    required: true
  },
  observations: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const FollowUp = mongoose.model('FollowUp', FollowUpSchema);
