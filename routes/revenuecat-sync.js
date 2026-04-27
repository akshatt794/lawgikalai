// routes/revenuecat-sync.js
// ✅ FIXED - iOS ONLY - RevenueCat subscription sync

const express = require("express");
const router = express.Router();
const { lightVerifyToken } = require("../middleware/lightVerifyToken");
const User = require("../models/User");
const Transaction = require("../models/transaction");

/**
 * POST /api/revenuecat/sync
 * ✅ iOS ONLY - Syncs Apple subscription with backend
 */
router.post("/sync", lightVerifyToken, async (req, res) => {
  try {
    const {
      productId,
      purchaseDate,
      expirationDate,
      transactionId,
      originalTransactionId,
      isActive,
      willRenew,
      isTrialPeriod,
      platform,
    } = req.body;

    // ✅ ONLY ACCEPT iOS REQUESTS
    if (platform !== "ios") {
      return res.status(400).json({
        success: false,
        error: "Only iOS subscriptions are supported",
      });
    }

    console.log("[RevenueCat iOS] Syncing subscription:", {
      userId: req.user.userId,
      productId,
      transactionId,
    });

    // Get user
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // ✅ iOS product ID mapping
    const productMap = {
      "rc.monthly": {
        planName: "Advocate Starter Plan",
        duration: "1 Month",
      },
      "rc.quarterly": {
        planName: "Professional Litigator Plan",
        duration: "3 Months",
      },
      "rc.halfyearly": {
        planName: "Courtroom Power Plan",
        duration: "6 Months",
      },
      "rc.annually": {
        planName: "LawgikalAI Enterprise Premium",
        duration: "12 Months",
      },
    };

    const productInfo = productMap[productId];

    // Validate iOS product ID
    if (!productInfo) {
      return res.status(400).json({
        success: false,
        error: `Invalid iOS product ID: ${productId}`,
      });
    }

    // Check if we already processed this transaction
    if (user.plan?.transactionId === transactionId) {
      console.log("[RevenueCat iOS] Transaction already processed");
      return res.json({
        success: true,
        message: "Already synced",
        plan: user.plan,
      });
    }

    // Create transaction record
    const transaction = await Transaction.create({
      userId: user._id,
      planName: productInfo.planName,
      duration: productInfo.duration,
      paymentGateway: "Apple",
      appleTransactionId: transactionId,
      appleOriginalTransactionId: originalTransactionId,
      appleProductId: productId,
      status: isActive ? "success" : "pending",
      completedAt: isActive ? new Date() : null,
    });

    console.log("[RevenueCat iOS] Transaction created:", transaction._id);

    // ✅ CRITICAL FIX: Save full plan name, not product ID
    user.plan = {
      name: productInfo.planName, // ← WAS: productId, NOW: productInfo.planName
      duration: productInfo.duration,
      startDate: new Date(purchaseDate),
      endDate: new Date(expirationDate),
      source: "REVENUECAT_IOS",
      platform: "ios",
      transactionId: transactionId,
      originalTransactionId: originalTransactionId,
      isActive: isActive,
      willAutoRenew: willRenew,
      isTrialPeriod: isTrialPeriod,
      lastVerified: new Date(),
    };

    await user.save();

    console.log("[RevenueCat iOS] User plan updated:", {
      planName: user.plan.name,
      endDate: user.plan.endDate,
      isActive: user.plan.isActive,
    });

    res.json({
      success: true,
      message: "iOS subscription synced successfully",
      plan: {
        name: productInfo.planName,
        productId: productId,
        platform: "ios",
        expiresDate: expirationDate,
        isActive: isActive,
        willAutoRenew: willRenew,
      },
    });
  } catch (err) {
    console.error("[RevenueCat iOS] Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to sync iOS subscription",
    });
  }
});

/**
 * GET /api/revenuecat/status
 * ✅ Check iOS subscription status
 */
router.get("/status", lightVerifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Check if user has ANY active plan
    if (!user.plan || !user.plan.name) {
      return res.json({
        success: true,
        hasSubscription: false,
        platform: null,
      });
    }

    const now = new Date();
    const endDate = user.plan.endDate ? new Date(user.plan.endDate) : null;
    const isActive = endDate ? endDate > now : false;

    res.json({
      success: true,
      hasSubscription: isActive,
      platform: user.plan.platform || "ios",
      subscription: {
        productId: user.plan.name, // Full plan name
        startDate: user.plan.startDate,
        expiresDate: user.plan.endDate,
        isActive: isActive,
        willAutoRenew: user.plan.willAutoRenew,
        isTrialPeriod: user.plan.isTrialPeriod,
      },
    });
  } catch (err) {
    console.error("[RevenueCat iOS Status] Error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to get iOS subscription status",
    });
  }
});

module.exports = router;