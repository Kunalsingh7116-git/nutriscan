const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  alert_id: { type: String, unique: true },
  user_id: { type: String, required: true },
  date: { type: String, required: true },
  alert_type: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['Read', 'Unread'], default: 'Unread' },
}, { timestamps: true });

AlertSchema.pre('save', async function (next) {
  if (!this.alert_id) {
    const count = await mongoose.model('Alert').countDocuments();
    this.alert_id = `A${String(count + 101).padStart(3, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Alert', AlertSchema);
