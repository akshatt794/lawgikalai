const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: String,
  identifier: { type: String, unique: true }, // email or phone
  password: String,
  otp: String,
  otpExpires: Date,
});

module.exports = mongoose.model('User', userSchema);
