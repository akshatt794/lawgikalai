const express = require('express');
const News = require('../models/News');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('../config/cloudinary');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const BASE_URL = process.env.BASE_URL || 'https://lawgikalai-auth-api.onrender.com';

// ----------- Dynamic Upload Directory Setup -----------
const UPLOAD_DIR = process.env.NODE_ENV === 'production' ? '/tmp/uploads/news' : 'uploads/news';
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

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

function adminOnly(req, res, next) {
  return next();
}

// ✅ Upload News with Full Details
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const {
      title,
      content,
      category,
      date,
      source,
      summary,
      fullUpdate,
      sc_said,
      announced_by,
      applies_to,
      legal_impact,
      legal_sections,
      createdAt
    } = req.body;

    let imageUrl = null;
    if (req.file) {
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: 'news'
      });
      imageUrl = uploadResult.secure_url;
      fs.unlinkSync(req.file.path);
    }

    const news = new News({
      title,
      content,
      category,
      date,
      source,
      summary,
      fullUpdate,
      sc_said,
      announced_by,
      applies_to,
      legal_impact,
      legal_sections: JSON.parse(legal_sections || '[]'),
      image: imageUrl,
      createdAt
    });

    await news.save();
    res.json({ message: 'News uploaded with extended fields!', news });

  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed', details: err.message });
  }
});

// ✅ Related News by Category
router.get('/related/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const relatedNews = await News.find({ category }).limit(6).sort({ createdAt: -1 });
    res.json({ message: 'Related updates fetched', related: relatedNews });
  } catch (err) {
    console.error('Related fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch related news', details: err.message });
  }
});

router.get('/all', async (req, res) => {
  try {
    const news = await News.find().sort({ createdAt: -1 });
    const formatted = news.map(n => ({
      ...n.toObject(),
      image: n.image?.startsWith('/uploads') ? `${BASE_URL}${n.image}` : n.image,
    }));
    res.json({ news: formatted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/save', auth, async (req, res) => {
  try {
    const { newsId } = req.body;
    if (!newsId) return res.status(400).json({ error: 'newsId required' });
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.savedNews.includes(newsId)) {
      user.savedNews.push(newsId);
      await user.save();
    }

    res.json({ message: 'News saved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/saved', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate('savedNews');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const formattedNews = user.savedNews.map(news => {
      const createdAt = new Date(news.createdAt);
      const formattedDate = createdAt.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });

      const imageUrl = news.image?.startsWith('/uploads') ? `${BASE_URL}${news.image}` : news.image;

      return {
        ...news.toObject(),
        image: imageUrl,
        createdAt: formattedDate
      };
    });

    res.json({ savedNews: formattedNews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/list', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const news = await News.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('title content image createdAt');

    const total = await News.countDocuments();

    const formatted = news.map(n => ({
      ...n.toObject(),
      image: n.image?.startsWith('/uploads') ? `${BASE_URL}${n.image}` : n.image,
    }));

    res.json({
      message: "News list fetched",
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      count: formatted.length,
      data: formatted
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch news", details: err.message });
  }
});

router.get('/:newsId', async (req, res) => {
  try {
    const newsId = req.params.newsId;
    const token = req.headers.authorization?.split(' ')[1];

    let userId = null;
    let isSaved = false;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.userId;

        const user = await User.findById(userId);
        if (user && Array.isArray(user.savedNews)) {
          console.log('Checking savedNews:', user.savedNews.map(id => id.toString()));
          console.log('Looking for:', newsId);
          isSaved = user.savedNews.map(id => id.toString()).includes(newsId.toString());
        }
      } catch (err) {
        console.warn('Token verification failed or user not found:', err.message);
      }
    }

    const newsItem = await News.findById(newsId);
    if (!newsItem) return res.status(404).json({ error: "News not found" });

    const imageUrl = newsItem.image?.startsWith('/uploads')
      ? `${BASE_URL}${newsItem.image}`
      : newsItem.image;

    res.json({
      ...newsItem.toObject(),
      image: imageUrl,
      isSaved
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch news item", details: err.message });
  }
});



router.post('/add', auth, async (req, res) => {
  try {
    const { title, content, image, publishedAt, source } = req.body;

    const news = new News({ title, content, image, publishedAt, source });
    await news.save();
    res.status(201).json({ message: "News added", news });
  } catch (err) {
    res.status(500).json({ error: "Failed to add news", details: err.message });
  }
});

router.delete('/save/:newsId', auth, async (req, res) => {
  const userId = req.user.userId; // ✅ pulled from token
  const { newsId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.savedNews = user.savedNews.filter(id => id.toString() !== newsId);
    await user.save();

    res.json({
      message: 'News removed from saved list',
      savedNews: user.savedNews
    });
  } catch (err) {
    console.error('Error deleting saved news:', err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});


router.post('/toggle-save', auth, async (req, res) => {
  try {
    const { newsId } = req.body;
    const userId = req.user?.userId;

    if (!userId) return res.status(401).json({ error: 'Missing userId in token' });
    if (!newsId) return res.status(400).json({ error: 'Missing newsId in request body' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!Array.isArray(user.savedNews)) {
      user.savedNews = [];
    }

    const savedNewsStringList = user.savedNews.map(id => id?.toString());
    const alreadySaved = savedNewsStringList.includes(newsId);

    if (alreadySaved) {
      user.savedNews = user.savedNews.filter(id => id?.toString() !== newsId);
    } else {
      user.savedNews.push(newsId);
    }

    await user.save();

    res.json({
      message: alreadySaved ? 'News unsaved' : 'News saved',
      saved: !alreadySaved
    });
  } catch (err) {
    console.error('❌ Toggle save error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

module.exports = router;
