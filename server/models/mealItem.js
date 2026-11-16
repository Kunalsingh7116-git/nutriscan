const mongoose = require('mongoose');

const nutrients = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium'];
const numericFields = Object.fromEntries(nutrients.map(key => [key, { type: Number, required: true, min: 0 }]));
const mealItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  grams: { type: Number, required: true, min: 1, max: 5000 },
  ...numericFields,
}, { _id: false });

function validMealItem(item) {
  return item && typeof item.name === 'string' && item.name.trim().length > 0 && item.name.length <= 100
    && Number.isFinite(item.grams) && item.grams >= 1 && item.grams <= 5000
    && nutrients.every(key => Number.isFinite(item[key]) && item[key] >= 0 && item[key] <= 50000);
}

module.exports = { mealItemSchema, nutrients, validMealItem };
