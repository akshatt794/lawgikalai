const express = require('express');
const News = require('../models/News');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// JWT authentication middleware
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

// Middleware: Only allow if user is Admin (implement based on your User model/roles)
function adminOnly(req, res, next) {
  // If you want strict admin, add a 'role' field to user and check: req.user.role === 'admin'
  // For now, allow all for demo
  // Example: if (req.user && req.user.role === 'admin') return next();
  return next();
}

// ========== Upload News (Admin only) ==========
router.post('/upload', auth, adminOnly, async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'All fields required' });
    const news = new News({ title, content, createdBy: req.user.userId });
    await news.save();
    res.json({ message: 'News uploaded', news });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== Get All News ==========
router.get('/all', async (req, res) => {
  try {
    const news = await News.find().sort({ createdAt: -1 });
    res.json({ news });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== Save News (bookmark) ==========
router.post('/save', auth, async (req, res) => {
  try {
    const { newsId } = req.body;
    if (!newsId) return res.status(400).json({ error: 'newsId required' });
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Prevent duplicate saves
    if (!user.savedNews.includes(newsId)) {
      user.savedNews.push(newsId);
      await user.save();
    }

    res.json({ message: 'News saved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== Get Saved News ==========
router.get('/saved', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate('savedNews');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ savedNews: user.savedNews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
