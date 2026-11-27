const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('node:crypto');

const UserSchema = new mongoose.Schema({
  user_id: { type: String, unique: true, default: () => randomUUID() },
  name: {
    first: { type: String, required: true },
    last: { type: String, required: true },
  },
  email: { type: String, required: true, unique: true, lowercase: true },
  google_sub: { type: String, unique: true, sparse: true, select: false },
  password: { type: String, select: false, required() { return !this.google_sub; } },
  phone_number: [String],
  deletingAt: { type: Date, select: false },
  sessionVersion: { type: Number, default: 0, select: false },
  writeVersion: { type: Number, default: 0, select: false },
  date_of_birth: { type: Date, required() { return !this.google_sub; } },
}, { timestamps: true });

UserSchema.pre('save', async function () {
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

UserSchema.virtual('age').get(function () {
  if (!this.date_of_birth) return null;
  const today = new Date();
  const dob = new Date(this.date_of_birth);
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
});

UserSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('User', UserSchema);
