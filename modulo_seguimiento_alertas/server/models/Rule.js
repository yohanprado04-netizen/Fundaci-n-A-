import mongoose from 'mongoose';

const RuleSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  conditionJson: {
    type: Object,
    required: true
  },
  defaultSeverity: {
    type: String,
    enum: ['Información', 'Recordatorio', 'Advertencia', 'Riesgo', 'Crítica'],
    default: 'Riesgo'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const Rule = mongoose.model('Rule', RuleSchema);
