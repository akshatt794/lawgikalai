const express = require('express');
const router = express.Router();
const FcmToken = require('../models/FcmToken');

// POST /api/notifications/register-token
router.post('/register-token', async (req, res) => {
  const { userId, token } = req.body;

  if (!userId || !token) {
    return res.status(400).json({ error: 'userId and token are required' });
  }

  try {
    const exists = await FcmToken.findOne({ userId, token });
    if (!exists) {
      await FcmToken.create({ userId, token });
    }

    res.status(200).json({ message: 'FCM token registered successfully!' });
  } catch (err) {
    console.error('FCM register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
