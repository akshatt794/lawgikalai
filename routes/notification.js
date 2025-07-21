// /routes/notifications.js
const express = require('express');
const router = express.Router();
const admin = require('../utils/firebase');
const User = require('../models/User'); // assuming user model has a `fcmToken` field
const verifyToken = require('../middleware/verifyToken');

// ✅ Save FCM Token for logged-in user
router.post('/save-token', verifyToken, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'FCM token is required' });

    const user = await User.findByIdAndUpdate(req.user.userId, { fcmToken: token }, { new: true });
    res.json({ message: 'FCM token saved', user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save token', details: err.message });
  }
});

// ✅ Send a notification to a user by their FCM token
router.post('/send', async (req, res) => {
  const { title, body, token } = req.body;

  if (!title || !body || !token) {
    return res.status(400).json({ error: 'title, body and token are required' });
  }

  const message = {
    notification: { title, body },
    token
  };

  try {
    const response = await admin.messaging().send(message);
    res.json({ message: 'Notification sent', response });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send notification', details: err.message });
  }
});

module.exports = router;
