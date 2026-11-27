const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');

const NutritionDetailsSchema = new mongoose.Schema({
  nutrition_id: { type: String, unique: true, default: () => randomUUID() },
  product_id: { type: String, required: true, unique: true },
  calories: { type: Number, required: true, min: 0 },
  sugar: { type: Number, required: true, min: 0 },
  sodium: { type: Number, required: true, min: 0 },
  fat: { type: Number, required: true, min: 0 },
  protein: { type: Number, required: true, min: 0 },
}, { timestamps: true });

module.exports = mongoose.model('NutritionDetails', NutritionDetailsSchema);
