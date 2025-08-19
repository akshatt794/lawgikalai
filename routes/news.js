const express = require('express');
const News = require('../models/News');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ========= AWS S3 (v3) via ENV =========
const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'ap-south-1';
const BUCKET =
  process.env.S3_BUCKET_NAME ||
  process.env.AWS_S3_BUCKET ||
  process.env.AWS_BUCKET_NAME; // supports multiple names

const S3_PREFIX = process.env.S3_PREFIX || 'news';
// Leave S3_ACL unset for buckets with Object Ownership = Bucket owner enforced
const S3_ACL = (process.env.S3_ACL && process.env.S3_ACL.trim()) || null;
// If using CloudFront/custom domain, set S3_PUBLIC_BASE explicitly
const S3_PUBLIC_BASE =
  process.env.S3_PUBLIC_BASE || (BUCKET ? `https://${BUCKET}.s3.${REGION}.amazonaws.com` : '');

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const s3 = new S3Client({
  region: REGION,
  // If not using an instance role, these envs will be picked up automatically.
  // To force credentials, uncomment:
  // credentials: (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) ? {
  //   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  //   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  // } : undefined
});

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const BASE_URL = process.env.BASE_URL || 'https://lawgikalai-auth-api.onrender.com';

// Use /tmp in prod (ephemeral) and local path in dev
const UPLOAD_DIR = process.env.NODE_ENV === 'production' ? '/tmp/uploads/news' : 'uploads/news';
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ---- Multer (disk) + allow images & PDFs ----
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const allowedMimes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf'
];
const fileFilter = (req, file, cb) => {
  if (!allowedMimes.includes(file.mimetype)) {
    return cb(new Error('Only images (jpg/png/webp/gif) or PDF allowed'));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});

// ---- Auth helpers ----
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

function getUserIdFromToken(req) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return null;
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.userId;
  } catch {
    return null;
  }
}

// ---- helpers ----
function pickImageURL(obj) {
  // returns a plain URL string if available; otherwise null
  if (!obj) return null;
  // for Mongoose docs, call toObject/lean before when needed; we only read known keys here
  const img =
    obj?.image?.secure_url ||
    obj?.image?.url ||
    (typeof obj?.image === 'string' ? obj.image : null) ||
    obj?.imageUrl ||
    obj?.thumbnailUrl ||
    null;

  // keep legacy local uploads behaviour
  if (img && typeof img === 'string' && img.startsWith('/uploads')) {
    return `${BASE_URL}${img}`;
  }
  return img;
}

// ---- Upload (to AWS S3) ----
router.post('/upload', upload.single('image'), async (req, res) => {
  let localPath;
  try {
    const {
      title, content, category, date, source, summary, fullUpdate,
      sc_said, announced_by, applies_to, legal_impact, legal_sections, createdAt
    } = req.body;

    let imageUrl = null;

    if (req.file) {
      if (!BUCKET) throw new Error('S3 bucket is not configured via env');
      localPath = req.file.path;

      const ext = path.extname(req.file.originalname || req.file.filename) || '';
      const key = `${S3_PREFIX}/${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;

      const putParams = {
        Bucket: BUCKET,
        Key: key,
        Body: fs.createReadStream(localPath),
        ContentType: req.file.mimetype
      };
      if (S3_ACL) putParams.ACL = S3_ACL; // skip ACL when bucket enforces ownership
      await s3.send(new PutObjectCommand(putParams));

      imageUrl = `${S3_PUBLIC_BASE}/${key}`;
    }

    // safe parse of legal_sections
    let legalSectionsParsed = [];
    if (Array.isArray(legal_sections)) {
      legalSectionsParsed = legal_sections;
    } else if (typeof legal_sections === 'string' && legal_sections.trim()) {
      try { legalSectionsParsed = JSON.parse(legal_sections); } catch { legalSectionsParsed = []; }
    }

    // Build a base object
    const data = {
      title, content, category, date, source, summary, fullUpdate,
      sc_said, announced_by, applies_to, legal_impact,
      legal_sections: legalSectionsParsed,
      createdAt
    };

    // Put the S3 URL where your schema expects it
    if (imageUrl) {
      const imagePath = News.schema.path('image');

      if (imagePath && imagePath.instance === 'String') {
        // Schema: image: String
        data.image = imageUrl;
      } else if (imagePath && (imagePath.instance === 'Embedded' || imagePath.instance === 'Mixed')) {
        // Schema: image: { url: String } (or Mixed)
        data.image = { url: imageUrl };
      } else if (News.schema.path('imageUrl')) {
        // Schema uses imageUrl instead of image
        data.imageUrl = imageUrl;
      } else {
        // Fallback: save as flat string
        data.image = imageUrl;
      }
    }

    const news = new News(data);
    const saved = await news.save();

    // --- ensure response order: put `image` right after `legal_sections` ---
    const base = saved.toObject();
    const imgValue =
      imageUrl ||
      base?.image?.url ||
      (typeof base?.image === 'string' ? base.image : null) ||
      base?.imageUrl ||
      null;

    const orderedNews = {};
    for (const key of Object.keys(base)) {
      orderedNews[key] = base[key];
      if (key === 'legal_sections') {
        // inject image immediately after legal_sections
        orderedNews.image = imgValue;
      }
    }
    // if for some reason legal_sections isn't present, ensure image exists
    if (!('image' in orderedNews)) orderedNews.image = imgValue;

    return res.json({ message: 'News uploaded with extended fields!', news: orderedNews });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: 'Upload failed', details: err.message });
  } finally {
    if (localPath) {
      fs.promises.unlink(localPath).catch(() => {});
    }
  }
});

// ---- Related by category ----
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

// ---- All ----
router.get('/all', async (req, res) => {
  try {
    const news = await News.find().sort({ createdAt: -1 });
    const userId = getUserIdFromToken(req);
    let savedIds = [];
    if (userId) {
      const user = await User.findById(userId);
      if (user?.savedNews) {
        savedIds = user.savedNews.map(id => id?.toString()).filter(Boolean);
      }
    }

    const formatted = news.map(n => {
      const obj = n.toObject();
      return {
        ...obj,
        image: pickImageURL(obj), // normalize to URL string
        isSaved: savedIds.includes(n._id.toString())
      };
    });
    res.json({ news: formatted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Save / Saved / List / Get by ID / Add / Delete saved / Toggle save ----
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
      const obj = news.toObject();
      const createdAt = new Date(news.createdAt);
      const formattedDate = createdAt.toLocaleDateString('en-GB', {
        day: '2-digit', month: 'long', year: 'numeric'
      });
      return {
        ...obj,
        image: pickImageURL(obj), // normalize to URL string
        createdAt: formattedDate,
        isSaved: true
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

    const news = await News.find().sort({ createdAt: -1 }).skip(skip).limit(limit);
    const total = await News.countDocuments();

    const userId = getUserIdFromToken(req);
    let savedIds = [];
    if (userId) {
      const user = await User.findById(userId);
      if (user?.savedNews) {
        savedIds = user.savedNews.map(id => id?.toString()).filter(Boolean);
      }
    }

    const formatted = news.map(n => {
      const obj = n.toObject();
      return {
        ...obj,
        image: pickImageURL(obj), // normalize to URL string
        isSaved: savedIds.includes(n._id.toString())
      };
    });

    res.json({
      message: 'News list fetched',
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      count: formatted.length,
      data: formatted
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch news', details: err.message });
  }
});

router.get('/:newsId', async (req, res) => {
  try {
    const newsId = req.params.newsId;
    const userId = getUserIdFromToken(req);
    let isSaved = false;

    if (userId) {
      const user = await User.findById(userId);
      if (user?.savedNews) {
        const saved = user.savedNews.map(id => id?.toString()).filter(Boolean);
        isSaved = saved.includes(newsId.toString());
      }
    }

    const newsItem = await News.findById(newsId);
    if (!newsItem) {
      return res.status(404).json({ error: 'News not found' });
    }

    const obj = newsItem.toObject();
    const imageUrl = pickImageURL(obj); // normalize to URL string

    res.status(200).json({
      message: 'News by ID fetched successfully',
      news: {
        ...obj,
        image: imageUrl,
        isSaved
      }
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to fetch news item',
      details: err.message
    });
  }
});

router.post('/add', auth, async (req, res) => {
  try {
    const { title, content, image, publishedAt, source } = req.body;
    const news = new News({ title, content, image, publishedAt, source });
    await news.save();
    res.status(201).json({ message: 'News added', news });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add news', details: err.message });
  }
});

router.delete('/save/:newsId', auth, async (req, res) => {
  const userId = req.user.userId;
  const { newsId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.savedNews = user.savedNews.filter(id => id?.toString() !== newsId);
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

    const savedNewsStringList = user.savedNews.map(id => id?.toString()).filter(Boolean);
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
