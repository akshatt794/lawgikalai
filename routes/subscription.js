const express = require('express');
const router = express.Router();
const SubscriptionPlan = require('../models/SubscriptionPlan');
const PurchasedSubscription = require('../models/PurchasedSubscription'); // ✅ import this

// ✅ GET all active plans
router.get('/', async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true }).sort({ price: 1 });
    res.json({
      message: "Plan fetched successfully",
      plans: plans
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ POST new plan (for admin, use later)
router.post('/create', async (req, res) => {
  try {
    const { name, duration, price, features } = req.body;
    const newPlan = new SubscriptionPlan({ name, duration, price, features });
    await newPlan.save();
    res.status(201).json({ message: 'Plan created', plan: newPlan });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
// ✅ GET purchased subscriptions (admin route)
router.get('/purchased', async (req, res) => {
  try {
    const purchasedPlans = await PurchasedSubscription.find()
      .populate('userId', 'name email') // Adjust fields as per your User model
      .populate('planId', 'name price duration')
      .sort({ startDate: -1 });

    res.json({
      message: "Purchased plans fetched successfully",
      count: purchasedPlans.length,
      purchases: purchasedPlans
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ✅ POST /api/subscription/purchase
router.post('/purchase', async (req, res) => {
  try {
    const { userId, planId } = req.body;

    const newPurchase = new PurchasedSubscription({
      userId,
      planId,
      startDate: new Date(),
    });

    await newPurchase.save();

    res.status(201).json({ message: 'Purchase recorded', purchase: newPurchase });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
