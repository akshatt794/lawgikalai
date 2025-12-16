const express = require("express");
const router = express.Router();
const Announcement = require("../models/Announcement");

// 🔐 Optional auth middleware (uncomment if needed)
const jwt = require("jsonwebtoken");
const notifications = require("./notifications");
const { sendNotificationToAllUsers } = notifications;
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

// JWT auth middleware
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Missing token" });

  const token = header.split(" ")[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    console.error("JWT Error:", err.message);
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    return res.status(401).json({ error: "Unauthorized access" });
  }
}

// const auth = require('../middleware/auth');

// GET all announcements with optional search
router.get("/", async (req, res) => {
  try {
    const { search } = req.query;
    const query = search ? { title: { $regex: search, $options: "i" } } : {};

    const announcements = await Announcement.find(query).sort({
      createdAt: -1,
    });
    res.json({ message: "Announcements fetched", data: announcements });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

/* ==========================================================
   ✅ NEW: GET /api/announcements/all
   Fetch all announcements (paginated)
   ========================================================== */
router.get("/all", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Announcement.countDocuments();
    const announcements = await Announcement.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    if (!announcements.length) {
      return res.json({
        message: "No announcements found.",
        count: 0,
        currentPage: page,
        totalPages: 0,
        data: [],
      });
    }

    res.json({
      message: "✅ All announcements fetched successfully.",
      count: total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      data: announcements,
    });
  } catch (err) {
    console.error("❌ Error fetching announcements:", err);
    res.status(500).json({
      error: "Failed to fetch announcements",
      details: err.message,
    });
  }
});

// GET total count of announcements
router.get("/count", async (req, res) => {
  try {
    const count = await Announcement.countDocuments();
    res.json({ message: "Count fetched", total: count });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
});
// Add announcement (Admin)
router.post("/add", auth, async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }

    const newAnnouncement = new Announcement({ title, content });
    await newAnnouncement.save();

    // ✅ Broadcast notification to all users
    await sendNotificationToAllUsers(
      `New Announcement: ${title}`,
      content.slice(0, 80) + "...", // short preview
      {
        type: "announcement",
        entityId: newAnnouncement._id,
      }
    );

    res.json({
      message: "Announcement added and notification sent successfully",
      announcement: newAnnouncement,
    });
  } catch (err) {
    console.error("Error adding announcement:", err.message);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});
// GET announcements by search term (param)
router.get("/search/:term?", async (req, res) => {
  try {
    const { term } = req.params;
    const query = term ? { title: { $regex: term, $options: "i" } } : {};

    const announcements = await Announcement.find(query).sort({
      createdAt: -1,
    });
    res.json({ message: "Announcements fetched", data: announcements });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// 🗑️ DELETE an announcement by ID (Admin Only)
router.delete("/delete/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Announcement ID is required." });
    }

    const deleted = await Announcement.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ error: "Announcement not found." });
    }

    res.json({
      message: "🗑️ Announcement deleted successfully.",
      deletedId: id,
    });
  } catch (err) {
    console.error("❌ Error deleting announcement:", err);
    res.status(500).json({
      error: "Server error while deleting announcement.",
      details: err.message,
    });
  }
});

// ✅ Get single announcement by ID
router.get("/:id", async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement)
      return res.status(404).json({ error: "Announcement not found" });

    res.json({
      message: "Announcement fetched successfully",
      data: announcement,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

module.exports = router;
