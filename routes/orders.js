const { Readable } = require('stream');
const express = require('express');
const router = express.Router();
const upload = require('../middleware/multer');
const cloudinary = require('../config/cloudinary'); // Make sure this exists
const Order = require('../models/Order');

router.post('/upload', upload.single('order'), async (req, res) => {
  try {
    console.log("➡️ Upload route hit");
    if (!req.file) {
      console.log("❌ No file received");
      return res.status(400).json({ error: 'No PDF uploaded' });
    }

    console.log("📦 File received:", req.file.originalname);
    console.log("📦 File type:", req.file.mimetype);
    console.log("📦 File size:", req.file.size);

    const bufferStream = Readable.from(req.file.buffer);

    const cloudResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'lawgikalai-orders',
          resource_type: 'auto', // ✅ THIS IS THE FIX
          type: 'upload',
          public_id: req.file.originalname.replace(/\.pdf$/, '').replace(/\s+/g, '_')
        },
        (error, result) => {
          if (error) {
            console.error("❌ Cloudinary upload error:", error);
            reject(error);
          } else {
            console.log("✅ Uploaded to Cloudinary:", result.secure_url);
            resolve(result);
          }
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
