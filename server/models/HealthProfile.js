const mongoose = require('mongoose');

const HealthProfileSchema = new mongoose.Schema({
  profile_id: { type: String, unique: true },
  user_id: { type: String, required: true, unique: true },
  weight: { type: Number, required: true, min: 0 },
  height: { type: Number, required: true, min: 0 },
  lifestyle_type: { type: String, enum: ['Active', 'Sedentary', 'Moderate'], required: true },
  medical_conditions: [String],
  allergies: [String],
}, { timestamps: true });

HealthProfileSchema.pre('save', async function (next) {
  if (!this.profile_id) {
    const count = await mongoose.model('HealthProfile').countDocuments();
    this.profile_id = `HP${String(count + 101).padStart(3, '0')}`;
  }
  next();
});

// Virtual BMI
HealthProfileSchema.virtual('bmi').get(function () {
  if (!this.weight || !this.height) return null;
  return (this.weight / Math.pow(this.height / 100, 2)).toFixed(1);
});
HealthProfileSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('HealthProfile', HealthProfileSchema);
