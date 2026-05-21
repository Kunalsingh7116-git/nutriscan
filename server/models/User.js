const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  user_id: { type: String, unique: true },
  name: {
    first: { type: String, required: true },
    last: { type: String, required: true },
  },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  phone_number: [String],
  date_of_birth: { type: Date, required: true },
}, { timestamps: true });

// Auto-generate user_id
UserSchema.pre('save', async function (next) {
  if (!this.user_id) {
    const count = await mongoose.model('User').countDocuments();
    this.user_id = `U${String(count + 101).padStart(3, '0')}`;
  }
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
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
