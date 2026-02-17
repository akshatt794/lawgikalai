// routes/iap-sync.js
// ✅ iOS ONLY – expo-iap / Apple StoreKit subscription sync
//    (replaces routes/revenuecat-sync.js)

const express = require("express");
const router = express.Router();
const { lightVerifyToken } = require("../middleware/lightVerifyToken");
const User = require("../models/User");
const Transaction = require("../models/transaction");

// ─── Optional: server-side Apple receipt validation ──────────────────────────
// Uncomment and configure if you want to re-validate receipts on the backend.
// const { validateReceiptProduction, validateReceiptSandbox } = require("../services/appleReceiptValidator");

/**
 * POST /api/iap/sync
 * ✅ iOS ONLY – Syncs an Apple StoreKit subscription with the backend.
 *
 * Body fields (sent by useIAP.ts → _handleSuccessfulPurchase):
 *   productId              – e.g. "lawgikalai.starter"
 *   purchaseDate           – ISO string
 *   expirationDate         – ISO string
 *   transactionId          – App Store transaction identifier
 *   originalTransactionId  – original transaction identifier (for renewals)
 *   isActive               – boolean
 *   willRenew              – boolean
 *   isTrialPeriod          – boolean
 *   platform               – must be "ios"
 *   transactionReceipt     – raw base64 receipt (optional, for server re-validation)
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
      transactionReceipt, // optional – for server-side re-validation
    } = req.body;

    // ── Guard: iOS only ──────────────────────────────────────────────────────
    if (platform !== "ios") {
      return res.status(400).json({
        success: false,
        error: "Only iOS subscriptions are supported by this endpoint",
      });
    }

    console.log("[IAP iOS] Syncing subscription for user:", req.user.userId);

    // ── (Optional) Server-side receipt re-validation ─────────────────────────
    // If you want to verify the receipt with Apple directly on the server,
    // uncomment the block below.  This protects against tampered requests.
    //
    // if (transactionReceipt) {
    //   try {
    //     const result = await validateReceiptProduction({ "receipt-data": transactionReceipt });
    //     // inspect result.status, result.latest_receipt_info, etc.
    //   } catch (validationErr) {
    //     console.error("[IAP iOS] Server-side receipt validation failed:", validationErr);
    //     // Decide whether to reject the request or fall through
    //   }
    // }

    // ── Fetch user ───────────────────────────────────────────────────────────
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // ── Product ID → display info mapping ────────────────────────────────────
    const productMap = {
      "monthly": {
        planName: "Advocate Starter Plan",
        duration: "1 Month",
      },
      "quaterly": {
        planName: "Professional Litigator Plan",
        duration: "3 Months",
      },
      "halfyearly": {
        planName: "Courtroom Power Plan",
        duration: "6 Months",
      },
      "annual": {
        planName: "LawgikalAI Enterprise Premium",
        duration: "12 Months",
      },
    };

    const productInfo = productMap[productId];
    if (!productInfo) {
      return res.status(400).json({
        success: false,
        error: `Invalid iOS product ID: ${productId}`,
      });
    }

    // ── Idempotency check ────────────────────────────────────────────────────
    if (user.plan?.transactionId === transactionId) {
      console.log("[IAP iOS] Transaction already processed:", transactionId);
      return res.json({
        success: true,
        message: "Already synced",
        plan: user.plan,
      });
    }

    // ── Create transaction record ────────────────────────────────────────────
    const transaction = await Transaction.create({
      userId: user._id,
      planName: productInfo.planName,
      duration: productInfo.duration,
      paymentGateway: "Apple", // StoreKit / App Store
      appleTransactionId: transactionId,
      appleOriginalTransactionId: originalTransactionId,
      appleProductId: productId,
      status: isActive ? "success" : "pending",
      completedAt: isActive ? new Date() : null,
    });

    console.log("[IAP iOS] Transaction record created:", transaction._id);

    // ── Update user plan ─────────────────────────────────────────────────────
    user.plan = {
      name: productId,
      duration: productInfo.duration,
      startDate: new Date(purchaseDate),
      endDate: new Date(expirationDate),
      source: "APPLE_IAP", // ← was "REVENUECAT_IOS"
      platform: "ios",
      transactionId,
      originalTransactionId,
      isActive,
      willAutoRenew: willRenew,
      isTrialPeriod,
      lastVerified: new Date(),
    };

    await user.save();

    console.log("[IAP iOS] User plan updated successfully");

    return res.json({
      success: true,
      message: "iOS subscription synced successfully",
      plan: {
        name: productInfo.planName,
        productId,
        platform: "ios",
        expiresDate: expirationDate,
        isActive,
        willAutoRenew: willRenew,
      },
    });
  } catch (err) {
    console.error("[IAP iOS] Sync error:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to sync iOS subscription",
    });
  }
});

/**
 * GET /api/iap/status
 * ✅ Returns the stored iOS subscription status for the authenticated user.
 */
router.get("/status", lightVerifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Only return iOS subscriptions synced via this endpoint
    if (!user.plan || user.plan.platform !== "ios") {
      return res.json({
        success: true,
        hasSubscription: false,
        platform: null,
      });
    }

    const now = new Date();
    const isActive = new Date(user.plan.endDate) > now;

    return res.json({
      success: true,
      hasSubscription: true,
      platform: "ios",
      subscription: {
        productId: user.plan.name,
        startDate: user.plan.startDate,
        expiresDate: user.plan.endDate,
        isActive,
        willAutoRenew: user.plan.willAutoRenew,
        isTrialPeriod: user.plan.isTrialPeriod,
      },
    });
  } catch (err) {
    console.error("[IAP iOS Status] Error:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to get iOS subscription status",
    });
  }
});

module.exports = router;
