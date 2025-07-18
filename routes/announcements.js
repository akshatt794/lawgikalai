const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');

// 🔐 Optional auth middleware (uncomment if needed)
// const auth = require('../middleware/auth');

// GET all announcements with optional search
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    const query = search
      ? { title: { $regex: search, $options: 'i' } }
      : {};

    const announcements = await Announcement.find(query).sort({ createdAt: -1 });
    res.json({ message: 'Announcements fetched', data: announcements });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// GET total count of announcements
router.get('/count', async (req, res) => {
  try {
    const count = await Announcement.countDocuments();
    res.json({ message: 'Count fetched', total: count });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

module.exports = router;
