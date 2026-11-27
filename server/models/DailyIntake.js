const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');

const DailyIntakeSchema = new mongoose.Schema({
  intake_id: { type: String, unique: true, default: () => randomUUID() },
  user_id: { type: String, required: true },
  date: { type: String, required: true },
  total_calories: { type: Number, default: 0 },
  total_sugar: { type: Number, default: 0 },
  total_sodium: { type: Number, default: 0 },
  total_fat: { type: Number, default: 0 },
  total_protein: { type: Number, default: 0 },
  total_carbs: { type: Number, default: 0 },
  total_fiber: { type: Number, default: 0 },
}, { timestamps: true });

DailyIntakeSchema.index({ user_id: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyIntake', DailyIntakeSchema);
