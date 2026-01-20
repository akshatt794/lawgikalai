// routes/revenuecat-sync.js
// ✅ iOS ONLY - RevenueCat subscription sync

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
      platform, // ← Should be "ios"
    } = req.body;

    // ✅ ONLY ACCEPT iOS REQUESTS
    if (platform !== "ios") {
      return res.status(400).json({
        success: false,
        error: "Only iOS subscriptions are supported",
      });
    }

    console.log(
      "[RevenueCat iOS] Syncing subscription for user:",
      req.user.userId,
    );

    // Get user
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // ✅ iOS product ID mapping
    const productMap = {
      "lawgikalai.sub.monthly": {
        planName: "Advocate Starter Plan",
        duration: "1 Month",
      },
      "lawgikalai.sub.quarterly": {
        planName: "Professional Litigator Plan",
        duration: "3 Months",
      },
      "lawgikalai.sub.halfyear": {
        planName: "Courtroom Power Plan",
        duration: "6 Months",
      },
      "lawgikalai.sub.yearly": {
        planName: "LawgikalAI Enterprise Premium",
        duration: "12 Months",
      },
    };

    const productInfo = productMap[productId];

    // Validate iOS product ID
    if (!productInfo) {
      return res.status(400).json({
        success: false,
        error: "Invalid iOS product ID",
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
      paymentGateway: "Apple", // ✅ iOS = Apple
      appleTransactionId: transactionId,
      appleOriginalTransactionId: originalTransactionId,
      appleProductId: productId,
      status: isActive ? "success" : "pending",
      completedAt: isActive ? new Date() : null,
    });

    console.log("[RevenueCat iOS] Transaction created:", transaction._id);

    // Update user's plan
    user.plan = {
      name: productId,
      duration: productInfo.duration,
      startDate: new Date(purchaseDate),
      endDate: new Date(expirationDate),
      source: "REVENUECAT_IOS", // ✅ Explicitly mark as iOS
      platform: "ios", // ✅ Track platform
      transactionId: transactionId,
      originalTransactionId: originalTransactionId,
      isActive: isActive,
      willAutoRenew: willRenew,
      isTrialPeriod: isTrialPeriod,
      lastVerified: new Date(),
    };

    await user.save();

    console.log("[RevenueCat iOS] User plan updated successfully");

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

    // ✅ Only return iOS subscriptions
    if (!user.plan || user.plan.platform !== "ios") {
      return res.json({
        success: true,
        hasSubscription: false,
        platform: null,
      });
    }

    const now = new Date();
    const isActive = user.plan.endDate > now;

    res.json({
      success: true,
      hasSubscription: true,
      platform: "ios",
      subscription: {
        productId: user.plan.name,
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
