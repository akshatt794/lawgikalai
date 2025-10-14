const express = require("express");
const router = express.Router();
const Case = require("../models/Case");
const { verifyToken } = require("../middleware/verifyToken");
const jwt = require("jsonwebtoken"); // required for legacy fallback
const mongoose = require("mongoose");

// ✅ Utility to generate case_id
function generateCaseId() {
    const date = new Date();
    const yyyymmdd = date.toISOString().split("T")[0].replace(/-/g, "");
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `CASE-${yyyymmdd}-${random}`;
}

// ✅ Add Case API (Protected)
router.post("/add", verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId || req.user.id || req.user._id;

        const caseData = {
            ...req.body,
            case_id: generateCaseId(),
            userId,
        };

        const newCase = new Case(caseData);
        await newCase.save();

        // ✅ Only send message, no case data
        res.json({ message: "Case added successfully" });
    } catch (err) {
        res.status(500).json({
            error: "Something broke!",
            details: err.message,
        });
    }
});

// ✅ Get case list for logged-in user with status filter
router.get("/list", verifyToken, async (req, res) => {
    try {
        const { status, page = 1, limit = 10, search = "" } = req.query;
        const query = {
            userId: new mongoose.Types.ObjectId(req.user.userId),
        };

        if (status) {
            query.case_status = { $regex: `^${status}$`, $options: "i" };
        }

        if (search) {
            query.case_title = { $regex: search, $options: "i" }; // 🔍 case-insensitive title match
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const cases = await Case.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .select(
                "case_id case_title client_info.client_name court_name hearing_details.next_hearing_date case_status"
            );

        const total = await Case.countDocuments(query);

        res.json({
            message: "Cases fetched successfully",
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalItems: total,
            count: cases.length,
            data: cases,
        });
    } catch (err) {
        res.status(500).json({ error: "Server error", details: err.message });
    }
});

// ✅ Edit a case by case_id or _id (if user owns it)
router.put("/", verifyToken, async (req, res) => {
  try {
    const { caseId } = req.query;

    if (!caseId) {
      return res.status(400).json({ error: "Missing caseId parameter" });
    }

    // 🔍 Find the existing case by custom case_id first (preferred)
    const existingCase =
      (await Case.findOne({ case_id: caseId, userId: req.user.userId })) ||
      (await Case.findOne({ _id: caseId, userId: req.user.userId }));

    if (!existingCase) {
      return res.status(404).json({ error: "Case not found" });
    }

    // ✅ Merge new updates into the existing case
    const updatedData = {
      ...req.body,
      documents: req.body.documents || existingCase.documents, // keep old docs if not provided
    };

    const updatedCase = await Case.findByIdAndUpdate(
      existingCase._id,
      { $set: updatedData },
      { new: true }
    );

    res.json({
      message: "Case updated successfully",
      data: updatedCase,
    });
  } catch (err) {
    console.error("❌ Error updating case:", err);
    res.status(500).json({
      error: "Failed to update case",
      details: err.message,
    });
  }
});


// ✅ Get details of a case by either Mongo _id or custom case_id
router.get("/", verifyToken, async (req, res) => {
    try {
        const caseId = req.query.caseId;

        if (!caseId) {
            return res.status(400).json({ error: "Missing caseId parameter" });
        }

        // Try to find by case_id first, then _id
        const caseDetails =
            (await Case.findOne({ case_id: caseId })) ||
            (await Case.findById(caseId));

        if (!caseDetails) {
            return res.status(404).json({ error: "Case not found" });
        }

        res.json({
            message: "Case details fetched successfully",
            data: caseDetails,
        });
    } catch (err) {
        res.status(500).json({
            error: "Server error while fetching case details",
            details: err.message,
        });
    }
});


// ✅ Delete a case by case_id (only if user owns it)
router.delete("/", verifyToken, async (req, res) => {
    try {
        const { caseId } = req.query;

        if (!caseId) {
            return res.status(400).json({ error: "Missing caseId parameter" });
        }

        const deletedCase = await Case.findOneAndDelete({
            case_id: caseId,
            userId: req.user.userId,
        });

        if (!deletedCase) {
            return res
                .status(404)
                .json({ error: "Case not found or not authorized to delete" });
        }

        res.json({
            message: "Case deleted successfully",
            case: deletedCase,
        });
    } catch (err) {
        res.status(500).json({
            error: "Failed to delete case",
            details: err.message,
        });
    }
});
module.exports = router;
