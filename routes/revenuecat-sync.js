// routes/revenuecat-sync.js
// ✅ FIXED - Handles trial → paid subscription upgrades

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
      isTrialPeriod,
      expirationDate,
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

    // ✅ FIX: Check if we should update (compare expiration dates, not just transaction ID)
    const shouldUpdate =
      !user.plan?.transactionId || // No previous sync
      user.plan.transactionId !== transactionId || // Different transaction
      (user.plan.endDate &&
        new Date(user.plan.endDate).getTime() !==
          new Date(expirationDate).getTime()); // Dates changed (trial → paid)

    if (!shouldUpdate) {
      console.log("[RevenueCat iOS] Already synced with same data");
      return res.json({
        success: true,
        message: "Already synced",
        plan: user.plan,
      });
    }

    // Log if this is an upgrade from trial
    if (
      user.plan?.isTrialPeriod === true &&
      isTrialPeriod === false &&
      user.plan.transactionId === transactionId
    ) {
      console.log(
        "[RevenueCat iOS] ✅ Upgrading from trial to paid subscription",
      );
    }

    // Create transaction record (only if new transaction or trial → paid upgrade)
    const existingTransaction = await Transaction.findOne({
      userId: user._id,
      appleTransactionId: transactionId,
    });

    if (!existingTransaction) {
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
    } else {
      console.log(
        "[RevenueCat iOS] Transaction exists, updating user plan only",
      );
    }

    // ✅ ALWAYS UPDATE USER PLAN (even if transaction exists)
    user.plan = {
      name: productInfo.planName,
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

    console.log("[RevenueCat iOS] ✅ User plan updated:", {
      planName: user.plan.name,
      startDate: user.plan.startDate,
      endDate: user.plan.endDate,
      isActive: user.plan.isActive,
      isTrialPeriod: user.plan.isTrialPeriod,
    });

    res.json({
      success: true,
      message: isTrialPeriod
        ? "Trial subscription synced"
        : "Paid subscription synced",
      plan: {
        name: productInfo.planName,
        productId: productId,
        platform: "ios",
        startsDate: purchaseDate,
        expiresDate: expirationDate,
        isActive: isActive,
        willAutoRenew: willRenew,
        isTrialPeriod: isTrialPeriod,
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

    console.log("[RevenueCat iOS Status]", {
      userId: req.user.userId,
      planName: user.plan.name,
      endDate: endDate?.toISOString(),
      isActive,
    });

    res.json({
      success: true,
      hasSubscription: isActive,
      platform: user.plan.platform || "ios",
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