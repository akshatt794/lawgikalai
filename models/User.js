const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: String,
  identifier: { type: String, unique: true }, // email or phone or username
  password: String,
  otp: String,
  otpExpires: Date,
  mobileNumber: String,
  email: String,
  barCouncilId: String,
  qualification: String,
  experience: String,
  practiceArea: [String]
});


module.exports = mongoose.model('User', userSchema);
