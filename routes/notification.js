const express = require('express');
const router = express.Router();
const admin = require('../utils/firebase');

// POST /api/notification/send
router.post('/send', async (req, res) => {
  const { token, title, body } = req.body;

  if (!token || !title || !body) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const message = {
    token,
    notification: {
      title,
      body
    }
  };

  try {
    const response = await admin.messaging().send(message);
    res.json({ success: true, response });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Notification failed to send' });
  }
});

module.exports = router;
