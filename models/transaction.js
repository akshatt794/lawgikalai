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
  paymentGateway: {
    type: String,
    default: "PhonePe",
  },
  transactionId: String, // from PhonePe
  phonePeOrderId: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Transaction", transactionSchema);
