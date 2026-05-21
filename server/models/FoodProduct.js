const mongoose = require('mongoose');

const FoodProductSchema = new mongoose.Schema({
  product_id: { type: String, unique: true },
  product_name: { type: String, required: true },
  brand: { type: String, required: true },
  category: { type: String, required: true },
  barcode: { type: String, unique: true, sparse: true },
  serving_size: { type: String, required: true },
}, { timestamps: true });

FoodProductSchema.pre('save', async function (next) {
  if (!this.product_id) {
    const count = await mongoose.model('FoodProduct').countDocuments();
    this.product_id = `P${String(count + 101).padStart(3, '0')}`;
  }
  next();
});

module.exports = mongoose.model('FoodProduct', FoodProductSchema);
