const mongoose = require('mongoose');

const DailyIntakeSchema = new mongoose.Schema({
  intake_id: { type: String, unique: true },
  user_id: { type: String, required: true },
  date: { type: String, required: true },
  total_calories: { type: Number, default: 0 },
  total_sugar: { type: Number, default: 0 },
  total_sodium: { type: Number, default: 0 },
  total_fat: { type: Number, default: 0 },
  total_protein: { type: Number, default: 0 },
}, { timestamps: true });

DailyIntakeSchema.index({ user_id: 1, date: 1 }, { unique: true });

DailyIntakeSchema.pre('save', async function (next) {
  if (!this.intake_id) {
    const count = await mongoose.model('DailyIntake').countDocuments();
    this.intake_id = `D${String(count + 101).padStart(3, '0')}`;
  }
  next();
});

module.exports = mongoose.model('DailyIntake', DailyIntakeSchema);
