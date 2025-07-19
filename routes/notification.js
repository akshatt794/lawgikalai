const express = require("express");
const router = express.Router();
const User = require("../models/User"); // or wherever your User model is

// Route: /api/notifications/register-token
router.post("/register-token", async (req, res) => {
  const { userId, token } = req.body;

  if (!userId || !token) {
    return res.status(400).json({ error: "userId and token are required" });
  }

  try {
    // Save FCM token to the user
    const user = await User.findByIdAndUpdate(userId, { fcmToken: token }, { new: true });
    res.status(200).json({ message: "Token registered successfully", user });
  } catch (error) {
    console.error("Register token error:", error);
    res.status(500).json({ error: "Failed to register token" });
  }
});

module.exports = router;
