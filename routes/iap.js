const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/verifyToken");
const { lightVerifyToken } = require("../middleware/lightVerifyToken");
const User = require("../models/User");

// TEMP: Trust Apple (Sandbox)
// PRODUCTION: Use App Store Server API or IAPKit
router.post("/apple/verify", lightVerifyToken, async (req, res) => {
  try {
    const { purchase } = req.body;

    if (!purchase?.productId) {
      return res.status(400).json({ error: "Invalid receipt" });
    }

    const user = await User.findById(req.user.userId);

    // Map productId → plan
    const planMap = {
      "lawgikalai.sub.monthly": 1,
      "lawgikalai.sub.quarterly": 3,
      "lawgikalai.sub.halfyear": 6,
      "lawgikalai.sub.yearly": 12,
    };

    const planInfo = planMap[purchase.productId];
    if (!planInfo) {
      return res.status(400).json({ error: "Unknown product" });
    }

    const now = new Date();
    const previousEnd = user.plan?.endDate ? new Date(user.plan.endDate) : null;

    const start = previousEnd && previousEnd > now ? previousEnd : now;
    const end = new Date(start);
    end.setMonth(end.getMonth() + planInfo);

    user.plan = {
      name: purchase.productId,
      startDate: start,
      endDate: end,
      source: "APPLE_IAP",
    };

    await user.save();

    res.json({ success: true });
  } catch (err) {
    console.error("Apple verify error:", err);
    res.status(500).json({ error: "Verification failed" });
  }
});

router.post("/apple/restore", lightVerifyToken, async (req, res) => {
  const { purchases } = req.body;
  if (!purchases?.length) {
    return res.status(400).json({ error: "No purchases" });
  }

  const latest = purchases[0];
  const productId = latest.productId || latest.id;

  const planMap = {
    "lawgikalai.sub.monthly": 1,
    "lawgikalai.sub.quarterly": 3,
    "lawgikalai.sub.halfyear": 6,
    "lawgikalai.sub.yearly": 12,
  };

  const months = planMap[productId];
  if (!months) return res.status(400).json({ error: "Invalid product" });

  const user = await User.findById(req.user.userId);

  const now = new Date();
  const previousEnd = user.plan?.endDate ? new Date(user.plan.endDate) : null;

  const start = previousEnd && previousEnd > now ? previousEnd : now;
  const end = new Date(start);
  end.setMonth(end.getMonth() + months);

  user.plan = {
    name: productId,
    startDate: start,
    endDate: end,
    source: "APPLE_IAP",
  };

  await user.save();

  res.json({ success: true });
});

module.exports = router;
