const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');

const FoodProductSchema = new mongoose.Schema({
  product_id: { type: String, unique: true, default: () => randomUUID() },
  product_name: { type: String, required: true },
  brand: { type: String, required: true },
  category: { type: String, required: true },
  barcode: { type: String, unique: true, sparse: true },
  serving_size: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('FoodProduct', FoodProductSchema);
