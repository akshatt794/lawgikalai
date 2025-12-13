const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  fullName: String,
  mobileNumber: String,
  email: String,
  barCouncilId: String,
  qualification: String,
  experience: String,
  practiceArea: [String], // Array of practice areas
  identifier: String, // for login (optional: you can remove if you use email only)
  password: String,
  pushTokens: {
    web: {
      type: [String],
      default: [],
    },
    expo: {
      type: [String],
      default: [],
    },
  },
  lastActiveAt: Date,
  otp: String,
  otpExpires: Date,
  isVerified: { type: Boolean, default: false },
  dailyPromptCount: { type: Number, default: 0 },
  lastPromptDate: { type: String, default: "" },
  savedNews: [{ type: mongoose.Schema.Types.ObjectId, ref: "News" }], // <--- Add this line
  activeSessions: [
    {
      token: String,
      device: String,
      createdAt: { type: Date, default: Date.now },
    },
  ],
  // ✅ NEW FIELD
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  // ✅ Subscription fields
  plan: {
    name: { type: String, default: null }, // e.g. "Advocate Starter Plan"
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
  },

  // ✅ Trial
  trial: {
    started: { type: Boolean, default: false },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
  },

  google: {
    accessToken: { type: String, default: null },
    refreshToken: { type: String, default: null },
    expiryDate: { type: Date, default: null },
    email: { type: String, default: null },
    connected: { type: Boolean, default: false },
  },
});

module.exports = mongoose.model("User", userSchema);
