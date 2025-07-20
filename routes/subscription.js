const express = require('express');
const router = express.Router();
const SubscriptionPlan = require('../models/SubscriptionPlan');

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

module.exports = router;
