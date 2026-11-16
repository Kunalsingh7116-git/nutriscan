const mongoose = require('mongoose');
const { mealItemSchema } = require('./mealItem');

const schema = new mongoose.Schema({
  user_id: { type: String, required: true },
  source_record: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  items: { type: [mealItemSchema], required: true },
  photo_id: { type: mongoose.Schema.Types.ObjectId, required: true },
}, { timestamps: true });
schema.index({ user_id: 1, createdAt: -1, _id: -1 });

module.exports = mongoose.model('SavedFood', schema);
