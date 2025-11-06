const express = require("express");
const crypto = require("crypto");
const axios = require("axios");
const User = require("../models/User");
const Transaction = require("../models/transaction");
const { verifyToken } = require("../middleware/verifyToken");

const router = express.Router();

// ✅ Environment variables
const PHONEPE_BASE_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox";
const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID;
const SALT_KEY = process.env.PHONEPE_SALT_KEY;
const SALT_INDEX = process.env.PHONEPE_SALT_INDEX;
const REDIRECT_URL = process.env.FRONTEND_URL + "/payment-status";

router.post("/initiate", verifyToken, async (req, res) => {
  try {
    const { planName, amount } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Create new transaction
    const transaction = new Transaction({
      userId: user._id,
      planName,
      amount,
      status: "pending",
    });
    await transaction.save();

    const data = {
      merchantId: MERCHANT_ID,
      merchantTransactionId: transaction._id.toString(),
      merchantUserId: user._id.toString(),
      amount: amount * 100, // in paise
      redirectUrl: `${REDIRECT_URL}?txnId=${transaction._id}`,
      redirectMode: "POST",
      callbackUrl: `${process.env.BACKEND_URL}/api/payment/verify`,
      paymentInstrument: {
        type: "PAY_PAGE",
      },
    };

    const payload = Buffer.from(JSON.stringify(data)).toString("base64");
    const checksum = crypto
      .createHash("sha256")
      .update(payload + "/pg/v1/pay" + SALT_KEY)
      .digest("hex");
    const finalChecksum = checksum + "###" + SALT_INDEX;

    const response = await axios.post(
      `${PHONEPE_BASE_URL}/pg/v1/pay`,
      { request: payload },
      {
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": finalChecksum,
        },
      }
    );

    const redirectUrl =
      response.data?.data?.instrumentResponse?.redirectInfo?.url;

    res.json({ redirectUrl });
  } catch (err) {
    console.error("PhonePe Init Error:", err.message);
    res.status(500).json({ error: "Failed to initiate payment" });
  }
});

// ✅ Payment verification webhook
router.post("/verify", async (req, res) => {
  try {
    const { merchantTransactionId, code } = req.body.data;
    const txn = await Transaction.findById(merchantTransactionId);
    if (!txn) return res.status(404).json({ error: "Transaction not found" });

    if (code === "PAYMENT_SUCCESS") {
      txn.status = "success";
      await txn.save();

      // Activate plan for user
      const user = await User.findById(txn.userId);
      const start = new Date();
      const end = new Date();
      if (txn.planName.includes("1 Month")) end.setMonth(end.getMonth() + 1);
      if (txn.planName.includes("3 Month")) end.setMonth(end.getMonth() + 3);
      if (txn.planName.includes("6 Month")) end.setMonth(end.getMonth() + 6);
      if (txn.planName.includes("12 Month"))
        end.setFullYear(end.getFullYear() + 1);

      user.plan = {
        name: txn.planName,
        startDate: start,
        endDate: end,
      };
      await user.save();
    } else {
      txn.status = "failed";
      await txn.save();
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Verification error:", err);
    res.status(500).json({ error: "Verification failed" });
  }
});

// ✅ Fetch all transactions for the logged-in user
router.get("/history", verifyToken, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ transactions });
  } catch (err) {
    console.error("Transaction history error:", err);
    res.status(500).json({ error: "Failed to fetch transaction history" });
  }
});

module.exports = router;
