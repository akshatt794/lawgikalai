const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');

// 🔐 Optional auth middleware (uncomment if needed)
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// JWT auth middleware
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Missing token' });

  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

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
// Add announcement (Admin)
router.post('/add', auth, async (req, res) => {
    try {
      const { title, content } = req.body;
  
      if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required' });
      }
  
      const newAnnouncement = new Announcement({ title, content });
      await newAnnouncement.save();
  
      res.json({ message: 'Announcement added successfully', announcement: newAnnouncement });
    } catch (err) {
      console.error('Error adding announcement:', err.message);
      res.status(500).json({ error: 'Server error', details: err.message });
    }
});
  
module.exports = router;
