const express = require('express');
const News = require('../models/News');
const router = express.Router();

// Middleware: Only allow if user is Admin (implement based on your User model/roles)
function adminOnly(req, res, next) {
  // Assuming user role is stored on req.user (set after JWT verification)
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ error: 'Admin only' });
}

// Admin: Upload News
router.post('/upload', adminOnly, async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'All fields required' });
  const news = new News({ title, content, createdBy: req.user.userId });
  await news.save();
  res.json({ message: 'News uploaded', news });
});

// User: Get all news
router.get('/', async (req, res) => {
  const news = await News.find().sort({ createdAt: -1 });
  res.json(news);
});

module.exports = router;
