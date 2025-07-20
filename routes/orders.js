const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../utils/cloudinary');
const Order = require('../models/Order'); // adjust the path if different

// Cloudinary storage for PDFs
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'lawgikalai-orders',
    resource_type: 'raw', // for PDF
    format: async () => 'pdf'
  }
});

const upload = multer({ storage });
router.get('/all', async (req, res) => {
  const all = await Order.find();
  res.json(all);
});

// @route   POST /api/orders/upload
// @desc    Upload PDF and return URL
router.post('/upload', upload.single('order'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF uploaded' });
    }

    res.json({
      title: req.body.title || "",
      file_name: req.file.originalname,
      file_url: req.file.path,
      message: "Order uploaded successfully!"
    });

  } catch (err) {
    console.error("❌ ERROR during upload:", err); // ← REAL error output
    res.status(500).json({ error: err.message || 'Something broke!' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;

    let query = {};
    if (search) {
      const regex = new RegExp('^' + search, 'i'); // case-insensitive, starts with
      query.file_name = { $regex: regex };
    }

    const orders = await Order.find(query).sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    console.error("❌ Failed to fetch orders:", err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});


module.exports = router;
