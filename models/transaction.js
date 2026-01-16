const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  planName: String,
  amount: Number,
  status: {
    type: String,
    enum: ["pending", "success", "failed"],
    default: "pending",
  },
  duration: String,
  paymentGateway: {
    type: String,
    enum: ["PhonePe", "Apple", "GooglePlay"],
    default: "PhonePe",
  },
  transactionId: String, // from PhonePe
  phonePeOrderId: String,
  merchantTransactionId: String,
  // Apple IAP specific fields
  appleTransactionId: String, // Apple's transaction ID
  appleOriginalTransactionId: String, // Original transaction ID (same across renewals)
  appleProductId: String, // e.g., "lawgikalai.sub.monthly"
  appleReceipt: String, // Base64 receipt data
  appleEnvironment: {
    type: String,
    enum: ["Sandbox", "Production"],
    default: null,
  },
  completedAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Indexes for quick lookups
transactionSchema.index({ userId: 1, status: 1 });
transactionSchema.index({ appleOriginalTransactionId: 1 });
transactionSchema.index({ merchantTransactionId: 1 });

// Update timestamp on save
transactionSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("Transaction", transactionSchema);
