const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');

const HealthProfileSchema = new mongoose.Schema({
  profile_id: { type: String, unique: true, default: () => randomUUID() },
  user_id: { type: String, required: true, unique: true },
  weight: { type: Number, required: true, min: 0.1 },
  height: { type: Number, required: true, min: 0.1 },
  lifestyle_type: { type: String, enum: ['Active', 'Sedentary', 'Moderate'], required: true },
  medical_conditions: [String],
  allergies: [String],
}, { timestamps: true });

// Virtual BMI
HealthProfileSchema.virtual('bmi').get(function () {
  if (!this.weight || !this.height) return null;
  return (this.weight / Math.pow(this.height / 100, 2)).toFixed(1);
});
HealthProfileSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('HealthProfile', HealthProfileSchema);
