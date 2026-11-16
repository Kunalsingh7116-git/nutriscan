const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');
const { mealItemSchema } = require('./mealItem');

const ConsumptionRecordSchema = new mongoose.Schema({
  record_id: { type: String, unique: true, default: () => randomUUID() },
  user_id: { type: String, required: true },
  product_id: { type: String, required() { return !this.meal_items?.length; } },
  meal_name: String,
  meal_items: { type: [mealItemSchema], default: undefined },
  photo_id: mongoose.Schema.Types.ObjectId,
  save_to_library: Boolean,
  quantity: { type: Number, required: true, min: 0 },
  date: { type: String, required: true },
  time: { type: String, required: true },
}, { timestamps: true });

ConsumptionRecordSchema.index({ user_id: 1, date: -1, time: -1 });

module.exports = mongoose.model('ConsumptionRecord', ConsumptionRecordSchema);
