const mongoose = require('mongoose');

const ConsumptionRecordSchema = new mongoose.Schema({
  record_id: { type: String, unique: true },
  user_id: { type: String, required: true },
  product_id: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  date: { type: String, required: true },
  time: { type: String, required: true },
}, { timestamps: true });

ConsumptionRecordSchema.pre('save', async function (next) {
  if (!this.record_id) {
    const count = await mongoose.model('ConsumptionRecord').countDocuments();
    this.record_id = `C${String(count + 101).padStart(3, '0')}`;
  }
  next();
});

module.exports = mongoose.model('ConsumptionRecord', ConsumptionRecordSchema);
