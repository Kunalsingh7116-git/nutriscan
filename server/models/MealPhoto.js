const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  public_id: { type: String, unique: true, sparse: true },
  user_id: { type: String, required: true },
  digest: { type: String, required: true },
  mime: { type: String, required: true },
  data: { type: Buffer, required: true },
}, { timestamps: true });
schema.index({ user_id: 1, digest: 1 }, { unique: true });

module.exports = mongoose.model('MealPhoto', schema);
