// /routes/notifications.js
const express = require('express');
const router = express.Router();
const admin = require('../utils/firebase');
const User = require('../models/User'); // Make sure this has 'fcmToken' field
const Notification = require('../models/Notification');
const verifyToken = require('../middleware/verifyToken');

// ✅ Save FCM token for the logged-in user
router.post('/save-token', verifyToken, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'FCM token is required' });

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { fcmToken: token },
      { new: true }
    );

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ message: 'FCM token saved successfully', user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save token', details: err.message });
  }
});

// ✅ Send notification to a logged-in user
router.post('/send', verifyToken, async (req, res) => {
  try {
    const { title, body, token: bodyToken } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const token = bodyToken || user.fcmToken;
    if (!token) return res.status(400).json({ error: 'FCM token not found for user' });

    const message = {
      notification: { title, body },
      token
    };

    const fcmResponse = await admin.messaging().send(message);

    // Save notification in DB
    const savedNotification = await Notification.create({
      title,
      body,
      userId: user._id
    });

    res.json({ success: true, fcmResponse, savedNotification });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send notification', details: err.message });
  }
});

// ✅ Get notification list for the logged-in user
router.get('/list', verifyToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.userId })
    .sort({ createdAt: -1 });

    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notifications', details: err.message });
  }
});

module.exports = router; 

