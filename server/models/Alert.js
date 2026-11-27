const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');

const AlertSchema = new mongoose.Schema({
  alert_id: { type: String, unique: true, default: () => randomUUID() },
  user_id: { type: String, required: true },
  date: { type: String, required: true },
  alert_type: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['Read', 'Unread'], default: 'Unread' },
}, { timestamps: true });

AlertSchema.index({ user_id: 1, status: 1 });

module.exports = mongoose.model('Alert', AlertSchema);
