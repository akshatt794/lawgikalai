const express = require('express');
const router = express.Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../utils/cloudinary');
const Order = require('../models/Order'); // ✅ import model

// Storage setup
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'lawgikalai-orders',
    resource_type: 'raw',
    format: async () => 'pdf'
  }
});

const upload = multer({ storage });

// ✅ POST /api/orders/upload — upload + save
router.post('/upload', upload.single('order'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No PDF uploaded' });

    const newOrder = new Order({
      title: req.body.title || "Untitled",
      file_name: req.file.originalname,
      file_url: req.file.path
    });

    await newOrder.save(); // ✅ save to DB

    res.json({
      message: 'Order uploaded and saved successfully!',
      order: newOrder
    });

  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

// @route   GET /api/orders
// @desc    Get all orders or search by title starting with a letter
// ✅ GET /api/orders — fetch all orders or filter by title
router.get('/', async (req, res) => {
  try {
    const { title } = req.query;

    let query = {};
    if (title) {
      query.title = { $regex: `^${title}`, $options: 'i' }; // case-insensitive startsWith
    }

    const orders = await Order.find(query).sort({ createdAt: -1 });

    res.json({
      message: "Orders fetched successfully",
      count: orders.length,
      orders
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
