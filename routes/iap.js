// routes/ios-iap-simplified.js
// ✅ SIMPLIFIED VERSION - Works with your existing mobile flow

const express = require("express");
const router = express.Router();
const axios = require("axios");
const { lightVerifyToken } = require("../middleware/lightVerifyToken");
const User = require("../models/User");
const Transaction = require("../models/transaction");

// Apple Receipt Validation URLs
const APPLE_SANDBOX_URL = "https://sandbox.itunes.apple.com/verifyReceipt";
const APPLE_PRODUCTION_URL = "https://buy.itunes.apple.com/verifyReceipt";

// Your App's Shared Secret
const APPLE_SHARED_SECRET = process.env.APPLE_SHARED_SECRET;

/**
 * Verify receipt with Apple's servers
 */
async function verifyAppleReceipt(receiptData, isRetry = false) {
  const url = isRetry ? APPLE_SANDBOX_URL : APPLE_PRODUCTION_URL;

  try {
    const response = await axios.post(
      url,
      {
        "receipt-data": receiptData,
        password: APPLE_SHARED_SECRET,
        "exclude-old-transactions": false,
      },
      {
        timeout: 10000,
      }
    );

    const { status, receipt, latest_receipt_info, pending_renewal_info } =
      response.data;

    // Retry with sandbox if production receipt sent to production
    if (status === 21007 && !isRetry) {
      console.log("Production receipt, retrying with sandbox");
      return verifyAppleReceipt(receiptData, true);
    }

    if (status !== 0) {
      console.error("Apple receipt validation failed:", status);
      return { valid: false, status, error: getAppleStatusError(status) };
    }

    return {
      valid: true,
      status,
      receipt,
      latest_receipt_info,
      pending_renewal_info,
      environment: isRetry ? "Sandbox" : "Production",
    };
  } catch (error) {
    console.error("Apple verification network error:", error.message);
    throw new Error("Failed to verify receipt with Apple");
  }
}

/**
 * Get human-readable error for Apple status codes
 */
function getAppleStatusError(status) {
  const errors = {
    21000: "The App Store could not read the JSON object",
    21002: "The receipt data was malformed",
    21003: "The receipt could not be authenticated",
    21004: "The shared secret does not match",
    21005: "The receipt server is not currently available",
    21006: "Receipt is valid but subscription has expired",
    21007: "This receipt is from the test environment",
    21008: "This receipt is from the production environment",
    21010: "This receipt could not be authorized",
  };
  return errors[status] || `Unknown error: ${status}`;
}

/**
 * Get the latest active subscription from receipt info
 */
function getLatestSubscription(latest_receipt_info) {
  if (!latest_receipt_info || latest_receipt_info.length === 0) {
    return null;
  }

  const sorted = latest_receipt_info.sort(
    (a, b) => parseInt(b.expires_date_ms) - parseInt(a.expires_date_ms)
  );

  const latest = sorted[0];
  const now = Date.now();
  const expiresAt = parseInt(latest.expires_date_ms);

  return {
    productId: latest.product_id,
    transactionId: latest.transaction_id,
    originalTransactionId: latest.original_transaction_id,
    purchaseDate: new Date(parseInt(latest.purchase_date_ms)),
    expiresDate: new Date(expiresAt),
    isActive: expiresAt > now,
    isTrialPeriod: latest.is_trial_period === "true",
    isInIntroOfferPeriod: latest.is_in_intro_offer_period === "true",
  };
}

/**
 * Check if subscription will auto-renew
 */
function getAutoRenewStatus(pending_renewal_info, originalTransactionId) {
  if (!pending_renewal_info || pending_renewal_info.length === 0) {
    return false;
  }

  const renewal = pending_renewal_info.find(
    (r) => r.original_transaction_id === originalTransactionId
  );

  return renewal?.auto_renew_status === "1";
}

/**
 * Map Apple product IDs to plan info
 */
function getProductInfo(productId) {
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

  return (
    productMap[productId] || {
      planName: productId,
      duration: "Unknown",
    }
  );
}

/**
 * POST /api/iap/ios/verify
 * ✅ SIMPLIFIED - No txnId required, creates transaction during verification
 */
router.post("/ios/verify", lightVerifyToken, async (req, res) => {
  try {
    const { receiptData, productId } = req.body;

    if (!receiptData) {
      return res.status(400).json({
        success: false,
        error: "Receipt data is required",
      });
    }

    if (!APPLE_SHARED_SECRET) {
      console.error("APPLE_SHARED_SECRET not configured");
      return res.status(500).json({
        success: false,
        error: "Server configuration error. Please contact support.",
      });
    }

    console.log("Verifying Apple receipt for user:", req.user.userId);

    // Verify receipt with Apple
    const verification = await verifyAppleReceipt(receiptData);

    if (!verification.valid) {
      console.error("Receipt validation failed:", verification.error);
      return res.status(400).json({
        success: false,
        error: verification.error || "Invalid receipt",
        status: verification.status,
      });
    }

    // Get latest subscription info
    const subscription = getLatestSubscription(
      verification.latest_receipt_info
    );

    if (!subscription) {
      return res.status(400).json({
        success: false,
        error: "No subscription found in receipt",
      });
    }

    console.log("Subscription found:", subscription.productId);

    // Check if we've already processed this transaction
    const user = await User.findById(req.user.userId);

    if (user.plan?.transactionId === subscription.transactionId) {
      console.log("Transaction already processed");
      return res.json({
        success: true,
        message: "Subscription already active",
        plan: user.plan,
      });
    }

    // Check if another user already used this transaction (fraud prevention)
    const existingTransaction = await Transaction.findOne({
      appleTransactionId: subscription.transactionId,
      status: "success",
    });

    if (
      existingTransaction &&
      existingTransaction.userId.toString() !== req.user.userId
    ) {
      console.error("Transaction already used by another user");
      return res.status(400).json({
        success: false,
        error: "This purchase has already been used",
      });
    }

    // Get auto-renew status
    const willAutoRenew = getAutoRenewStatus(
      verification.pending_renewal_info,
      subscription.originalTransactionId
    );

    const productInfo = getProductInfo(subscription.productId);

    // Create transaction record
    const transaction = await Transaction.create({
      userId: user._id,
      planName: productInfo.planName,
      duration: productInfo.duration,
      paymentGateway: "Apple",
      appleTransactionId: subscription.transactionId,
      appleOriginalTransactionId: subscription.originalTransactionId,
      appleProductId: subscription.productId,
      appleReceipt: receiptData,
      appleEnvironment: verification.environment,
      status: "success",
      completedAt: new Date(),
    });

    console.log("Transaction created:", transaction._id);

    // Update user's plan
    user.plan = {
      name: subscription.productId,
      duration: productInfo.duration,
      startDate: subscription.purchaseDate,
      endDate: subscription.expiresDate,
      source: "APPLE_IAP",
      transactionId: subscription.transactionId,
      originalTransactionId: subscription.originalTransactionId,
      isActive: subscription.isActive,
      willAutoRenew: willAutoRenew,
      isTrialPeriod: subscription.isTrialPeriod,
      lastVerified: new Date(),
      latestReceipt: receiptData,
    };

    await user.save();

    console.log("User plan updated successfully");

    res.json({
      success: true,
      message: "Subscription activated successfully",
      plan: {
        name: productInfo.planName,
        productId: subscription.productId,
        expiresDate: subscription.expiresDate,
        isActive: subscription.isActive,
        willAutoRenew: willAutoRenew,
      },
    });
  } catch (err) {
    console.error("iOS verify error:", err);
    res.status(500).json({
      success: false,
      error: "Verification failed. Please try again or contact support.",
    });
  }
});

/**
 * POST /api/iap/ios/restore
 * ✅ Restore purchases
 */
router.post("/ios/restore", lightVerifyToken, async (req, res) => {
  try {
    const { receiptData } = req.body;

    if (!receiptData) {
      return res.status(400).json({
        success: false,
        error: "Receipt data is required",
      });
    }

    console.log("Restoring purchases for user:", req.user.userId);

    // Verify receipt with Apple
    const verification = await verifyAppleReceipt(receiptData);

    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        error: verification.error || "Invalid receipt",
      });
    }

    // Get latest subscription info
    const subscription = getLatestSubscription(
      verification.latest_receipt_info
    );

    if (!subscription) {
      return res.json({
        success: true,
        message: "No active subscriptions found",
        hasActiveSubscription: false,
      });
    }

    console.log("Restoring subscription:", subscription.productId);

    // Check auto-renew status
    const willAutoRenew = getAutoRenewStatus(
      verification.pending_renewal_info,
      subscription.originalTransactionId
    );

    const productInfo = getProductInfo(subscription.productId);

    // Update user's plan
    const user = await User.findById(req.user.userId);

    user.plan = {
      name: subscription.productId,
      duration: productInfo.duration,
      startDate: subscription.purchaseDate,
      endDate: subscription.expiresDate,
      source: "APPLE_IAP",
      transactionId: subscription.transactionId,
      originalTransactionId: subscription.originalTransactionId,
      isActive: subscription.isActive,
      willAutoRenew: willAutoRenew,
      isTrialPeriod: subscription.isTrialPeriod,
      lastVerified: new Date(),
      latestReceipt: receiptData,
    };

    await user.save();

    // Create transaction record for history (if not exists)
    const existingTxn = await Transaction.findOne({
      appleTransactionId: subscription.transactionId,
    });

    if (!existingTxn) {
      await Transaction.create({
        userId: user._id,
        planName: productInfo.planName,
        duration: productInfo.duration,
        paymentGateway: "Apple",
        appleTransactionId: subscription.transactionId,
        appleOriginalTransactionId: subscription.originalTransactionId,
        appleProductId: subscription.productId,
        appleReceipt: receiptData,
        appleEnvironment: verification.environment,
        status: "success",
        completedAt: new Date(),
      });
    }

    console.log("Subscription restored successfully");

    res.json({
      success: true,
      message: "Subscription restored successfully",
      hasActiveSubscription: subscription.isActive,
      plan: {
        name: productInfo.planName,
        productId: subscription.productId,
        expiresDate: subscription.expiresDate,
        isActive: subscription.isActive,
        willAutoRenew: willAutoRenew,
      },
    });
  } catch (err) {
    console.error("iOS restore error:", err);
    res.status(500).json({
      success: false,
      error: "Restore failed. Please try again.",
    });
  }
});

/**
 * GET /api/iap/ios/status
 * Check subscription status
 */
router.get("/ios/status", lightVerifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user.plan || user.plan.source !== "APPLE_IAP") {
      return res.json({
        success: true,
        hasSubscription: false,
      });
    }

    const now = new Date();
    const isActive = user.plan.endDate > now;

    const productInfo = getProductInfo(user.plan.name);

    res.json({
      success: true,
      hasSubscription: true,
      subscription: {
        productId: user.plan.name,
        planName: productInfo.planName,
        startDate: user.plan.startDate,
        expiresDate: user.plan.endDate,
        isActive: isActive,
        willAutoRenew: user.plan.willAutoRenew,
        isTrialPeriod: user.plan.isTrialPeriod,
      },
    });
  } catch (err) {
    console.error("Status check error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to check status",
    });
  }
});

/**
 * POST /api/iap/ios/webhook
 * Apple Server Notifications
 */
router.post("/ios/webhook", express.json(), async (req, res) => {
  try {
    const { notificationType, subtype, data } = req.body;

    console.log("Apple webhook received:", { notificationType, subtype });

    const signedTransactionInfo = data?.signedTransactionInfo;
    if (!signedTransactionInfo) {
      return res.status(200).send("OK");
    }

    // Decode JWT payload (in production, verify signature first)
    const payload = JSON.parse(
      Buffer.from(signedTransactionInfo.split(".")[1], "base64").toString()
    );

    const originalTransactionId = payload.originalTransactionId;

    // Find user by original transaction ID
    const user = await User.findOne({
      "plan.originalTransactionId": originalTransactionId,
    });

    if (!user) {
      console.log("User not found for transaction:", originalTransactionId);
      return res.status(200).send("OK");
    }

    // Handle different notification types
    switch (notificationType) {
      case "SUBSCRIBED":
      case "DID_RENEW":
        user.plan.endDate = new Date(parseInt(payload.expiresDate));
        user.plan.isActive = true;
        user.plan.willAutoRenew = true;
        await user.save();
        console.log("Subscription renewed for user:", user._id);
        break;

      case "DID_FAIL_TO_RENEW":
        user.plan.willAutoRenew = false;
        await user.save();
        console.log("Renewal failed for user:", user._id);
        break;

      case "DID_CHANGE_RENEWAL_STATUS":
        if (subtype === "AUTO_RENEW_DISABLED") {
          user.plan.willAutoRenew = false;
        } else if (subtype === "AUTO_RENEW_ENABLED") {
          user.plan.willAutoRenew = true;
        }
        await user.save();
        console.log("Renewal status changed for user:", user._id);
        break;

      case "EXPIRED":
        user.plan.isActive = false;
        user.plan.willAutoRenew = false;
        await user.save();
        console.log("Subscription expired for user:", user._id);
        break;

      case "REFUND":
        user.plan = null;
        await user.save();
        console.log("Subscription refunded for user:", user._id);
        break;
    }

    res.status(200).send("OK");
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(200).send("OK");
  }
});

module.exports = router;
