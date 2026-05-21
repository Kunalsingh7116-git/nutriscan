const mongoose = require('mongoose');

const NutritionDetailsSchema = new mongoose.Schema({
  nutrition_id: { type: String, unique: true },
  product_id: { type: String, required: true, unique: true },
  calories: { type: Number, required: true, min: 0 },
  sugar: { type: Number, required: true, min: 0 },
  sodium: { type: Number, required: true, min: 0 },
  fat: { type: Number, required: true, min: 0 },
  protein: { type: Number, required: true, min: 0 },
}, { timestamps: true });

NutritionDetailsSchema.pre('save', async function (next) {
  if (!this.nutrition_id) {
    const count = await mongoose.model('NutritionDetails').countDocuments();
    this.nutrition_id = `N${String(count + 101).padStart(3, '0')}`;
  }
  next();
});

module.exports = mongoose.model('NutritionDetails', NutritionDetailsSchema);
