const mongoose = require('mongoose');

module.exports = mongoose.model('GoogleSignIn', new mongoose.Schema({
  state: { type: String, unique: true, required: true },
  claimHash: { type: String, unique: true, required: true },
  verifier: String,
  android: Boolean,
  status: String,
  userId: String,
  error: String,
  expiresAt: { type: Date, expires: 0, required: true },
}));
