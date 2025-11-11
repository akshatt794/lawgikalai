// routes/googleAuth.js
const express = require("express");
const { google } = require("googleapis");
const User = require("../models/User");
const { lightVerifyToken } = require("../middleware/lightVerifyToken");

const router = express.Router();
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

router.get("/auth-url", lightVerifyToken, (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
  });
  res.json({ url });
});

router.post("/save-tokens", lightVerifyToken, async (req, res) => {
  try {
    const { code } = req.body;
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ auth: oauth2Client, version: "v2" });
    const profile = await oauth2.userinfo.get();

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.google = {
      accessToken: tokens.access_token || null,
      refreshToken: tokens.refresh_token || user.google?.refreshToken || null,
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      email: profile?.data?.email || user.google?.email || null,
      connected: true,
    };

    await user.save();
    res.json({ message: "Google Calendar connected" });
  } catch (err) {
    console.error(
      "save-tokens error:",
      err?.response?.data || err?.message || err
    );
    res
      .status(500)
      .json({ error: "Failed to store tokens", details: err?.message });
  }
});

router.post("/disconnect", lightVerifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.google = {
      accessToken: null,
      refreshToken: null,
      expiryDate: null,
      email: null,
      connected: false,
    };
    await user.save();
    res.json({ message: "Disconnected" });
  } catch (err) {
    res.status(500).json({ error: "Failed", details: err.message });
  }
});

module.exports = router;
