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
    // generate merchantTransactionId (use randomUUID or any stable generator)
    const merchantTransactionId = `MT-${randomUUID()}`;

    // Create new transaction
    const transaction = new Transaction({
      userId: user._id,
      planName,
      amount,
      duration,
      merchantTransactionId,
      status: "pending",
    });
    await transaction.save();

    const metaInfo = MetaInfo.builder()
      .udf1(user._id.toString())
      .udf2(planName)
      .build();

    const payRequest = StandardCheckoutPayRequest.builder()
      .merchantOrderId(merchantTransactionId)
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
// helper: addMonths preserving day or falling back to month-end
function addMonthsSafe(date, months) {
  const d = new Date(date.getTime());
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);

  // If adding months overflowed (e.g., Jan 31 + 1 -> Mar 3), fix to last day of target month
  if (d.getDate() < day) {
    // move to last day of previous month (which is target month)
    d.setDate(0); // sets to last day of previous month
  }
  return d;
}

// parse duration robustly, return integer number of months
function parseDurationInMonths(durationStr) {
  if (!durationStr) return 1;
  const s = String(durationStr).toLowerCase().trim();

  // quick numeric extraction e.g. "3", "3 months", "12"
  const numMatch = s.match(/(\d{1,2})/);
  if (numMatch) {
    const n = parseInt(numMatch[1], 10);
    // If user passed '1 year' treat as 12 months
    if (s.includes("year") && n === 1) return 12;
    return n;
  }

  // fallback checks
  if (s.includes("1 month")) return 1;
  if (s.includes("3 months")) return 3;
  if (s.includes("6 months") ) return 6;
  if (s.includes("12 months") || s.includes("1 year") ) return 12;

  return 1; // default
}

router.post("/verify", async (req, res) => {
  try {
    const { txnId } = req.query;
    if (!txnId)
      return res.status(400).json({ error: "Transaction ID required" });

    const txn = await Transaction.findById(txnId);
    if (!txn) return res.status(404).json({ error: "Transaction not found" });

    // idempotency: if already processed successfully, return current plan
    if (txn.status === "success") {
      const userAlready = await User.findById(txn.userId).lean();
      return res.json({
        success: true,
        message: "Transaction already processed.",
        plan: userAlready?.plan || null,
      });
    }

    const merchantTxnId = txn.merchantTransactionId || txn._id.toString();

    // get order status from PhonePe
    const response = await phonePeClient.getOrderStatus(merchantTxnId);
    const state = response?.state;

    // debug log (remove or lower verbosity in production)
    console.log(
      "[verify] txnId:",
      txnId,
      "merchantTxnId:",
      merchantTxnId,
      "state:",
      state
    );

    const now = new Date();

    if (state === "COMPLETED") {
      // mark txn success (idempotent)
      txn.status = "success";
      txn.completedAt = new Date();
      await txn.save();

      // fetch user and compute start/end
      const user = await User.findById(txn.userId);

      const previousEnd = user.plan?.endDate
        ? new Date(user.plan.endDate)
        : null;
      const start = previousEnd && previousEnd > now ? previousEnd : now;

      // compute months to add from txn.duration
      const months = parseDurationInMonths(txn.duration);

      const end = addMonthsSafe(start, months);

      // Update user plan
      user.plan = {
        name: txn.planName,
        duration: txn.duration,
        startDate: start,
        endDate: end,
      };
      user.trial = { started: false, startDate: null, endDate: null };

      await user.save();

      console.log("[verify] plan applied:", {
        userId: user._id.toString(),
        start: user.plan.startDate,
        end: user.plan.endDate,
        monthsApplied: months,
      });

      return res.json({
        success: true,
        message: "Payment successful and plan activated.",
        plan: user.plan,
      });
    }

    if (state === "PENDING") {
      txn.status = "pending";
      await txn.save();
      return res.json({ success: false, message: "Payment is still pending." });
    }

    // failed/cancelled
    txn.status = "failed";
    await txn.save();
    return res.json({
      success: false,
      message: "Payment failed or cancelled.",
    });
  } catch (err) {
    console.error(
      "Verification error:",
      err.response?.data || err.message || err
    );
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
