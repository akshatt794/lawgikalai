const express = require("express");
const { randomUUID } = require("crypto");
const {
  StandardCheckoutClient,
  Env,
  MetaInfo,
  CreateSdkOrderRequest,
} = require("pg-sdk-node");
const User = require("../models/User");
const Transaction = require("../models/transaction");
const { lightVerifyToken } = require("../middleware/lightVerifyToken");

const router = express.Router();

// ENV VARIABLES
const PHONEPE_CLIENT_ID = process.env.PHONEPE_CLIENT_ID;
const PHONEPE_CLIENT_SECRET = process.env.PHONEPE_CLIENT_SECRET;
const PHONEPE_CLIENT_VERSION = process.env.PHONEPE_CLIENT_VERSION || "1.0.0";

const phonePeClient = StandardCheckoutClient.getInstance(
  PHONEPE_CLIENT_ID,
  PHONEPE_CLIENT_SECRET,
  PHONEPE_CLIENT_VERSION,
  process.env.NODE_ENV === "production" ? Env.PRODUCTION : Env.SANDBOX
);

// Helper functions for duration
function addMonthsSafe(date, months) {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d;
}

function parseDurationInMonths(str) {
  if (!str) return 1;
  const s = str.toLowerCase();
  const match = s.match(/(\d+)/);
  if (match) {
    const num = parseInt(match[1]);
    if (s.includes("year") && num === 1) return 12;
    return num;
  }
  if (s.includes("1 month")) return 1;
  if (s.includes("3 months")) return 3;
  if (s.includes("6 months")) return 6;
  if (s.includes("12 months") || s.includes("1 year")) return 12;
  return 1;
}

/* ---------------------------------------------------------
   1️⃣ INITIATE PAYMENT (MOBILE VERSION)
--------------------------------------------------------- */
router.post("/mobile/initiate", lightVerifyToken, async (req, res) => {
  try {
    const { planName, amount, duration } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const merchantOrderId = `MT-${randomUUID()}`;
    const amountInPaise = amount * 100;

    // Save transaction in DB (PENDING)
    const txn = await Transaction.create({
      userId: user._id,
      planName,
      amount,
      duration,
      merchantTransactionId: merchantOrderId,
      status: "pending",
    });

    const redirectUrl = `lawgikalai://payment/status?txnId=${txn._id}`; // deep link

    const metaInfo = MetaInfo.builder()
      .udf1(user._id.toString())
      .udf2(planName)
      .build();

    // ⭐ Correct PhonePe SDK Order Request Builder
    const request = CreateSdkOrderRequest.StandardCheckoutBuilder()
      .merchantOrderId(merchantOrderId)
      .amount(amountInPaise)
      .redirectUrl(redirectUrl)
      .metaInfo(metaInfo)
      .build();

    // ⭐ Correct function to call (NOT createOrder)
    const response = await phonePeClient.createSdkOrder(request);

    if (!response?.token) {
      return res.status(500).json({
        success: false,
        error: "Failed to create PhonePe SDK order",
        details: response,
      });
    }

    res.json({
      success: true,
      txnId: txn._id,
      orderId: merchantOrderId,
      token: response.token, // Use this token in RN SDK
      redirectUrl,
    });
  } catch (error) {
    console.error("Mobile createSdkOrder error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to initiate mobile PhonePe order",
    });
  }
});

/* ---------------------------------------------------------
   2️⃣ VERIFY PAYMENT (MOBILE VERSION)
--------------------------------------------------------- */
router.post("/mobile/verify", lightVerifyToken, async (req, res) => {
  try {
    const { txnId } = req.query;

    if (!txnId)
      return res.status(400).json({ error: "Transaction ID required" });

    const txn = await Transaction.findById(txnId);

    if (!txn) return res.status(404).json({ error: "Transaction not found" });

    if (txn.status === "success") {
      const user = await User.findById(txn.userId).lean();
      return res.json({
        success: true,
        message: "Already processed",
        plan: user.plan,
      });
    }

    const merchantTxnId = txn.merchantTransactionId;

    const response = await phonePeClient.getOrderStatus(merchantTxnId);
    const state = response?.state;

    if (state === "COMPLETED") {
      txn.status = "success";
      txn.completedAt = new Date();
      await txn.save();

      const user = await User.findById(txn.userId);

      const now = new Date();
      const previousEnd = user.plan?.endDate
        ? new Date(user.plan.endDate)
        : null;

      const startDate = previousEnd > now ? previousEnd : now;

      const months = parseDurationInMonths(txn.duration);
      const endDate = addMonthsSafe(startDate, months);

      user.plan = {
        name: txn.planName,
        duration: txn.duration,
        startDate,
        endDate,
        source: "PHONEPE",
      };

      await user.save();

      return res.json({
        success: true,
        message: "Payment successful",
        plan: user.plan,
      });
    }

    if (state === "PENDING") {
      return res.json({ success: false, message: "Pending" });
    }

    txn.status = "failed";
    await txn.save();

    return res.json({ success: false, message: "Failed" });
  } catch (err) {
    console.error("Verify Error:", err.response?.data || err);
    res.status(500).json({ error: "Verification failed" });
  }
});

/* ---------------------------------------------------------
   3️⃣ PAYMENT HISTORY (MOBILE)
--------------------------------------------------------- */
router.get("/mobile/history", lightVerifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const transactions = await Transaction.find({
      userId,
      status: "success",
    }).sort({ createdAt: -1 });

    const user = await User.findById(userId);

    res.json({
      transactions,
      plan: user.plan || null,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

module.exports = router;
