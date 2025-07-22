const express = require('express');
const router = express.Router();
const multer = require('multer');
const { Readable } = require('stream');
const cloudinary = require('../config/cloudinary');
const Order = require('../models/Order');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDFs allowed!'));
  }
});


router.post('/upload', upload.single('order'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileName = req.file.originalname.replace('.pdf', '');
    const bufferStream = new Readable();
    bufferStream.push(req.file.buffer);
    bufferStream.push(null); // end the stream

    const cloudResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'lawgikalai-orders',
          resource_type: 'auto',
          public_id: fileName,
          format: 'pdf'
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );

      bufferStream.pipe(stream);
    });

    const newOrder = new Order({
      title: req.body.title || 'Untitled',
      file_name: req.file.originalname,
      file_url: cloudResult.secure_url
    });

    await newOrder.save();

    res.json({
      message: 'Order uploaded and saved successfully!',
      order: newOrder
    });
  } catch (err) {
    console.error('❌ Upload error:', err);
    res.status(500).json({ error: 'Something broke!', details: err.message });
  }
});


// @route   GET /api/orders
// @desc    Get all orders or search by title starting with a letter
// ✅ GET /api/orders — fetch all orders or filter by title
router.get('/', async (req, res) => {
  try {
    const { title, page = 1, limit = 10 } = req.query;

    const query = {};
    if (title) {
      query.title = { $regex: `^${title}`, $options: 'i' }; // Optional search
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.json({
      message: "Orders fetched successfully",
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      count: orders.length,
      orders
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
