const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: String,
  mobileNumber: String,
  email: String,
  barCouncilId: String,
  qualification: String,
  experience: String,
  practiceArea: [String], // Array of practice areas
  identifier: String,     // for login (optional: you can remove if you use email only)
  password: String,
  otp: String,
  otpExpires: Date,
});

module.exports = mongoose.model('User', userSchema);
