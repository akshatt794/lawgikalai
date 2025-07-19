const mongoose = require('mongoose');

const fcmTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true },
}, { timestamps: true });

fcmTokenSchema.index({ userId: 1, token: 1 }, { unique: true });

module.exports = mongoose.model('FcmToken', fcmTokenSchema);
