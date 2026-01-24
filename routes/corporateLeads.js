const express = require("express");
const CorporateLead = require("../models/CorporateLead");
const { sendCorporateLeadEmail, sendCorporateLeadAutoReply } = require("../utils/leadEmailService");
const { lightVerifyToken } = require("../middleware/lightVerifyToken");

const router = express.Router();

// ----------------------
// 1️⃣ Submit Corporate Lead (PUBLIC)
// ----------------------
router.post("/", async (req, res) => {
  try {
    const { name, organization, email, phone, message } = req.body;

    if (!name || !organization || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be filled",
      });
    }

    const lead = new CorporateLead({
      name,
      organization,
      email,
      phone,
      message,
    });

    await lead.save();

    // 📧 Notify admin
    try {
      await sendCorporateLeadEmail(lead);
      await sendCorporateLeadAutoReply(lead);
    } catch (mailErr) {
      console.warn("⚠️ Lead email failed:", mailErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Lead submitted successfully",
    });
  } catch (err) {
    console.error("❌ Submit Corporate Lead Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// ----------------------
// 2️⃣ Get All Corporate Leads (ADMIN)
// ----------------------
router.get("/", lightVerifyToken, async (req, res) => {
  try {
    const leads = await CorporateLead.find().sort({ createdAt: -1 }).lean();

    return res.json({
      success: true,
      leads,
    });
  } catch (err) {
    console.error("❌ Fetch Corporate Leads Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// ----------------------
// 3️⃣ Update Lead Status (ADMIN)
// ----------------------
router.patch("/:leadId/status", lightVerifyToken, async (req, res) => {
  try {
    const { leadId } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const lead = await CorporateLead.findByIdAndUpdate(
      leadId,
      { status, notes },
      { new: true },
    );

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    return res.json({
      success: true,
      message: "Lead updated successfully",
      lead,
    });
  } catch (err) {
    console.error("❌ Update Lead Status Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// ----------------------
// 4️⃣ Delete Lead (ADMIN)
// ----------------------
router.delete("/:leadId", lightVerifyToken, async (req, res) => {
  try {
    const { leadId } = req.params;

    const lead = await CorporateLead.findByIdAndDelete(leadId);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    return res.json({
      success: true,
      message: "Lead deleted successfully",
    });
  } catch (err) {
    console.error("❌ Delete Lead Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

module.exports = router;
