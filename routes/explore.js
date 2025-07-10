const express = require('express');
const multer = require('multer');
const Explore = require('../models/Explore');
const path = require('path');

const router = express.Router();

// Setup Multer storage (compatible with Render and local)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // On Render use '/tmp', locally use 'uploads/'
    const dest = process.env.NODE_ENV === 'production' ? '/tmp' : 'uploads/';
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// PDF Upload endpoint
router.post('/upload', upload.single('pdf'), async (req, res) => {
  try {
    const { title } = req.body;
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // Serve the correct path depending on environment
    const isProd = process.env.NODE_ENV === 'production';
    const pdfPath = isProd
      ? `/uploads/${req.file.filename}`  // Render will serve /uploads route from /tmp
      : `/uploads/${req.file.filename}`; // Locally as before

    const doc = new Explore({ title, pdfUrl: pdfPath });
    await doc.save();

    res.json({ message: "Upload successful", data: doc });
  } catch (err) {
    console.error('Upload Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all PDFs
router.get('/all', async (req, res) => {
  const pdfs = await Explore.find();
  res.json({ pdfs });
});

module.exports = router;
