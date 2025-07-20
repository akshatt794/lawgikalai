const mongoose = require('mongoose');

const purchasedSubscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date }, // optional: add expiry logic
  status: { type: String, enum: ['active', 'expired'], default: 'active' }
});

module.exports = mongoose.model('PurchasedSubscription', purchasedSubscriptionSchema);
