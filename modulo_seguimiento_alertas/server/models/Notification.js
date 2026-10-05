import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  studentEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  studentName: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['intervencion', 'alerta', 'sistema'],
    default: 'intervencion'
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  interventionType: {
    type: String
  },
  teacherName: {
    type: String,
    required: true
  },
  nextFollowupDate: {
    type: String
  },
  status: {
    type: String,
    default: 'En proceso'
  },
  read: {
    type: Boolean,
    default: false
  },
  emailSent: {
    type: Boolean,
    default: true
  },
  emailSubject: {
    type: String
  },
  emailBody: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const Notification = mongoose.model('Notification', NotificationSchema);
