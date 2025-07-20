const express = require('express');
const admin = require('firebase-admin');
const path = require('path');
const router = express.Router();

// ✅ Import the local service account key
const serviceAccount = require(path.join(__dirname, '../firebaseServiceKey.json'));

// ✅ Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// 🔐 Save FCM Token
router.post('/register-token', async (req, res) => {
  const { userId, token } = req.body;

  if (!userId || !token) {
    return res.status(400).json({ error: "userId and token are required" });
  }

  try {
    // TODO: Save token to DB here
    console.log(`Token saved: ${token} for user ${userId}`);
    res.status(200).json({ message: "Token registered successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// 🚀 Send Notification
router.post("/send", async (req, res) => {
  const { token, title, body } = req.body;

  if (!token || !title || !body) {
    return res.status(400).json({ error: "token, title, and body are required" });
  }

  const message = {
    notification: {
      title,
      body,
    },
    token,
  };

  try {
    const response = await admin.messaging().send(message);
    res.status(200).json({ success: true, response });
  } catch (error) {
    console.error("Error sending FCM:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
