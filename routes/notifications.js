// /routes/notifications.js
const express = require("express");
const router = express.Router();
const admin = require("../utils/firebase");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { verifyToken } = require("../middleware/verifyToken");

// ✅ Save FCM token for the logged-in user
router.post("/save-token", verifyToken, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "FCM token is required" });

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { fcmToken: token },
      { new: true }
    );

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ message: "FCM token saved successfully", user });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to save token", details: err.message });
  }
});

// ✅ Helper: Send notification to all users
async function sendNotificationToAllUsers(title, body) {
  try {
    const users = await User.find({ fcmToken: { $exists: true, $ne: "" } });

    if (!users.length) {
      console.log("⚠️ No users with FCM token found.");
      return { success: false, message: "No users with FCM tokens" };
    }

    const tokens = users.map((u) => u.fcmToken);

    // Batch notifications using FCM multicast
    const message = {
      notification: { title, body },
      tokens, // up to 500 tokens per batch
    };

    const fcmResponse = await admin.messaging().sendEachForMulticast(message);

    // Save notification record for each user
    const notifications = users.map((u) => ({
      userId: u._id,
      title,
      body,
    }));
    await Notification.insertMany(notifications);

    console.log(`✅ Sent notifications to ${users.length} users.`);
    return { success: true, count: users.length, fcmResponse };
  } catch (err) {
    console.error("❌ Error sending broadcast notification:", err);
    return { success: false, error: err.message };
  }
}

// ✅ Send notification to a single logged-in user
router.post("/send", verifyToken, async (req, res) => {
  try {
    const { title, body, token: bodyToken } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const token = bodyToken || user.fcmToken;
    if (!token)
      return res.status(400).json({ error: "FCM token not found for user" });

    const message = { notification: { title, body }, token };
    const fcmResponse = await admin.messaging().send(message);

    await Notification.create({ title, body, userId: user._id });

    res.json({ success: true, fcmResponse });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to send notification", details: err.message });
  }
});

// ✅ Get notification list for the logged-in user
router.get("/list", verifyToken, async (req, res) => {
  try {
    const notifications = await Notification.find({
      userId: req.user.userId,
    }).sort({ sentAt: -1 });

    res.json({ notifications });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch notifications", details: err.message });
  }
});

// 🧹 DELETE a single notification by ID
router.delete("/clear/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Notification.findOneAndDelete({
      _id: id,
      userId: req.user.userId,
    });

    if (!deleted)
      return res
        .status(404)
        .json({ error: "Notification not found or unauthorized" });

    res.json({ success: true, message: "Notification cleared." });
  } catch (err) {
    console.error("❌ Error clearing notification:", err);
    res
      .status(500)
      .json({ error: "Failed to clear notification", details: err.message });
  }
});

// 🧹 DELETE all notifications for this user
router.delete("/clear-all", verifyToken, async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user.userId });
    res.json({ success: true, message: "All notifications cleared." });
  } catch (err) {
    console.error("❌ Error clearing all notifications:", err);
    res
      .status(500)
      .json({
        error: "Failed to clear all notifications",
        details: err.message,
      });
  }
});

// Export both router and broadcast function
module.exports = router;
module.exports.sendNotificationToAllUsers = sendNotificationToAllUsers;
