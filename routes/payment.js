const express = require("express");
const { randomUUID } = require("crypto");
const {
  StandardCheckoutClient,
  Env,
  MetaInfo,
  StandardCheckoutPayRequest,
} = require("pg-sdk-node");
const User = require("../models/User");
const Transaction = require("../models/transaction");
const { lightVerifyToken } = require("../middleware/lightVerifyToken");
const crypto = require("node:crypto");
const { default: axios } = require("axios");

const router = express.Router();

// ✅ Environment variables
const PHONEPE_CLIENT_ID = process.env.PHONEPE_CLIENT_ID;
const PHONEPE_CLIENT_SECRET = process.env.PHONEPE_CLIENT_SECRET;
const PHONEPE_CLIENT_VERSION = process.env.PHONEPE_CLIENT_VERSION || "1.0.0";
const FRONTEND_URL = process.env.FRONTEND_URL;

// ✅ Initialize PhonePe Client
const phonePeClient = StandardCheckoutClient.getInstance(
  PHONEPE_CLIENT_ID,
  PHONEPE_CLIENT_SECRET,
  PHONEPE_CLIENT_VERSION,
  process.env.NODE_ENV === "production" ? Env.PRODUCTION : Env.SANDBOX
);

// ✅ INITIATE PAYMENT
router.post("/initiate", lightVerifyToken, async (req, res) => {
  try {
    const { planName, amount, duration } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Create new transaction
    const transaction = new Transaction({
      userId: user._id,
      planName,
      amount,
      duration,
      status: "pending",
    });
    await transaction.save();

    const metaInfo = MetaInfo.builder()
      .udf1(user._id.toString())
      .udf2(planName)
      .build();

    const payRequest = StandardCheckoutPayRequest.builder()
      .merchantOrderId(transaction._id.toString())
      .amount(amount * 100)
      .redirectUrl(`${FRONTEND_URL}/payment-status?txnId=${transaction._id}`)
      .metaInfo(metaInfo)
      .build();

    console.log({
      clientId: PHONEPE_CLIENT_ID,
      clientSecret: PHONEPE_CLIENT_SECRET ? "***" : "MISSING",
      amount,
      planName,
      redirectUrl: `${FRONTEND_URL}/payment-status?txnId=${transaction._id}`,
    });

    const response = await phonePeClient.pay(payRequest);
    const redirectUrl = response?.redirectUrl;

    if (!redirectUrl) {
      console.error(
        "⚠️ PhonePe API response:",
        JSON.stringify(response, null, 2)
      );
      return res
        .status(500)
        .json({ error: "Failed to create payment session" });
    }

    res.json({ redirectUrl });
  } catch (err) {
    console.error(
      "PhonePe Init Error:",
      err.response?.data || err.message || err
    );
    res.status(500).json({ error: "Failed to initiate payment" });
  }
});

// ✅ VERIFY PAYMENT (SDK-BASED with getOrderStatus)
router.post("/verify", async (req, res) => {
  try {
    const { txnId } = req.query;
    if (!txnId) {
      return res.status(400).json({ error: "Transaction ID required" });
    }

    const txn = await Transaction.findById(txnId);
    if (!txn) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    // Use correct merchant transaction ID
    const merchantTxnId = txn.merchantTransactionId || txn._id.toString();

    const response = await phonePeClient.getOrderStatus(merchantTxnId);
    const state = response?.state;

    const now = new Date();

    if (state === "COMPLETED") {
      // Update transaction
      txn.status = "success";
      await txn.save();

      // Fetch user
      const user = await User.findById(txn.userId);

      // Calculate new plan start date
      const previousEnd = user.plan?.endDate
        ? new Date(user.plan.endDate)
        : null;

      // If user has active plan → new plan starts from previous end
      const start = previousEnd && previousEnd > now ? previousEnd : now;

      // Create end date
      const end = new Date(start.getTime());

      // Duration is stored inside transaction
      const duration = txn.duration?.toLowerCase() || "";

      if (duration.includes("1 month") || duration.includes("1 Month")) {
        end.setMonth(end.getMonth() + 1);
      } else if (
        duration.includes("3 months") ||
        duration.includes("3 Months")
      ) {
        end.setMonth(end.getMonth() + 3);
      } else if (
        duration.includes("6 months") ||
        duration.includes("6 Months")
      ) {
        end.setMonth(end.getMonth() + 6);
      } else if (
        duration.includes("12 months") ||
        duration.includes("1 year") ||
        duration.includes("12 Months") ||
        duration.includes("1 Year")
      ) {
        end.setFullYear(end.getFullYear() + 1);
      } else {
        console.warn("Unknown plan duration:", duration);
        end.setMonth(end.getMonth() + 1); // Fallback: 1 month
      }

      // Update user plan
      user.plan = {
        name: txn.planName,
        duration: txn.duration,
        startDate: start,
        endDate: end,
      };

      // Reset trial
      user.trial = { started: false, startDate: null, endDate: null };

      await user.save();

      return res.json({
        success: true,
        message: "Payment successful and plan activated.",
        plan: user.plan,
      });
    }

    // ---- PENDING CASE ----
    if (state === "PENDING") {
      txn.status = "pending";
      await txn.save();
      return res.json({
        success: false,
        message: "Payment is still pending.",
      });
    }

    // ---- FAILED CASE ----
    txn.status = "failed";
    await txn.save();
    return res.json({
      success: false,
      message: "Payment failed or cancelled.",
    });
  } catch (err) {
    console.error("Verification error:", err.response?.data || err.message);
    return res.status(500).json({ error: "Payment verification failed" });
  }
});

// ✅ FETCH TRANSACTION HISTORY
router.get("/history", lightVerifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Fetch only successful transactions
    const transactions = await Transaction.find({
      userId,
      status: "success",
    })
      .sort({ createdAt: -1 })
      .lean();

    // Fetch user's plan details
    const user = await User.findById(userId).lean();

    res.json({
      transactions,
      plan: user.plan || null, // return user's subscription info
    });
  } catch (err) {
    console.error("Transaction history error:", err);
    res.status(500).json({ error: "Failed to fetch transaction history" });
  }
});

module.exports = router;
