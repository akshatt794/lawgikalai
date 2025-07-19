const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
  name: { type: String, required: true },           // e.g. Monthly, Yearly
  duration: { type: String, required: true },       // e.g. 1 Month, 6 Months
  price: { type: Number, required: true },          // in INR
  features: [String],                               // included features
  isActive: { type: Boolean, default: true },       // toggle to disable plans
}, { timestamps: true });

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
