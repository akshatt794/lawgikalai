const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../utils/cloudinary');
const Order = require('../models/Order'); // ✅ Make sure you have this model

// Cloudinary storage for PDFs
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'lawgikalai-orders',
    resource_type: 'raw',
    format: async () => 'pdf'
  }
});

const upload = multer({ storage });

// @route   POST /api/orders/upload
// @desc    Upload PDF, save to DB and return URL
router.post('/upload', upload.single('order'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF uploaded' });
    }

    const newOrder = new Order({
      title: req.body.title || "",
      file_name: req.file.originalname,
      file_url: req.file.path
    });

    await newOrder.save(); // ✅ Save to MongoDB

    res.json({
      message: "✅ Order uploaded & saved successfully!",
      order: newOrder
    });

  } catch (err) {
    console.error("❌ Upload Error:", err);
    res.status(500).json({ error: err.message || 'Something broke!' });
  }
});

module.exports = router;
