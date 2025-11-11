const express = require("express");
const router = express.Router();
const Case = require("../models/Case");
const { verifyToken } = require("../middleware/verifyToken");
const jwt = require("jsonwebtoken"); // required for legacy fallback
const mongoose = require("mongoose");
const { lightVerifyToken } = require("../middleware/lightVerifyToken");
const {
  createEventForCase,
  upsertEventForCase,
  deleteEventForCase,
} = require("../utils/googleCalendar");

// ✅ Utility to generate case_id
function generateCaseId() {
  const date = new Date();
  const yyyymmdd = date.toISOString().split("T")[0].replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `CASE-${yyyymmdd}-${random}`;
}

// ✅ Add Case API (Protected)
router.post("/add", lightVerifyToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id || req.user._id;

    const caseData = {
      ...req.body,
      case_id: generateCaseId(),
      userId,
    };

    // try to create calendar event and save its id
    try {
      const eventId = await createEventForCase(userId, newCase.toObject());
      if (eventId) {
        newCase.hearing_details = newCase.hearing_details || {};
        newCase.hearing_details.googleEventId = eventId;
        await newCase.save();
      }
    } catch (err) {
      console.warn("Calendar create error (non-fatal):", err?.message || err);
    }

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
router.get("/list", lightVerifyToken, async (req, res) => {
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
router.put("/", lightVerifyToken, async (req, res) => {
  try {
    const { caseId } = req.query;
    if (!caseId) {
      return res.status(400).json({ error: "Missing caseId parameter" });
    }

    // ✅ Check if caseId is a valid ObjectId
    const query = mongoose.Types.ObjectId.isValid(caseId)
      ? { $or: [{ case_id: caseId }, { _id: caseId }] }
      : { case_id: caseId };

    // Find existing case safely
    const existingCase = await Case.findOne(query);
    if (!existingCase) {
      return res.status(404).json({ error: "Case not found" });
    }

    // ✅ Clean document list
    const newDocs = Array.isArray(req.body.documents) ? req.body.documents : [];
    const validDocs = newDocs
      .map((doc) => ({
        file_name: doc.file_name || doc.name || "",
        file_url: doc.file_url || doc.url || "",
        _id: doc._id || doc.id || undefined,
      }))
      .filter((doc) => doc.file_url);

    // ✅ Update case fields
    existingCase.set({
      ...req.body,
      documents: validDocs,
    });

    const updated = await existingCase.save();
    // attempt to upsert calendar event
    try {
      const existingEventId = updated.hearing_details?.googleEventId || null;
      const newEventId = await upsertEventForCase(
        req.user.userId,
        updated.toObject(),
        existingEventId
      );
      if (newEventId && newEventId !== existingEventId) {
        updated.hearing_details = updated.hearing_details || {};
        updated.hearing_details.googleEventId = newEventId;
        await updated.save();
      }
    } catch (err) {
      console.warn("Calendar upsert error (non-fatal):", err?.message || err);
    }

    res.json({
      message: "Case updated successfully",
      data: updated,
    });
  } catch (err) {
    console.error("Update Error:", err);
    res.status(500).json({
      error: "Failed to update case",
      details: err.message,
    });
  }
});

// ✅ Get details of a case by either Mongo _id or custom case_id
router.get("/", lightVerifyToken, async (req, res) => {
  try {
    const caseId = req.query.caseId;
    const userId = req.user.userId;

    if (caseId) {
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
    } else {
      // 🟡 Fetch all cases for this user (for homepage or dashboard)
      const cases = await Case.find({ userId })
        .sort({ "hearing_details.next_hearing_date": 1 })
        .lean();

      return res.json({
        message: "All cases fetched successfully",
        data: cases,
      });
    }
  } catch (err) {
    res.status(500).json({
      error: "Server error while fetching case details",
      details: err.message,
    });
  }
});

// ✅ Delete a case by case_id (only if user owns it)
router.delete("/", lightVerifyToken, async (req, res) => {
  try {
    const { caseId } = req.query;

    if (!caseId) {
      return res.status(400).json({ error: "Missing caseId parameter" });
    }

    const deletedCase = await Case.findOneAndDelete({
      case_id: caseId,
      userId: req.user.userId,
    });

    if (deletedCase) {
      try {
        const eventId = deletedCase.hearing_details?.googleEventId;
        if (eventId) {
          await deleteEventForCase(req.user.userId, eventId);
        }
      } catch (err) {
        console.warn("Calendar delete event failed:", err?.message || err);
      }
    }

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
