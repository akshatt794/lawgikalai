const { Readable } = require('stream');
const express = require('express');
const router = express.Router();
const upload = require('../middleware/multer');
const cloudinary = require('../config/cloudinary');
const Order = require('../models/Order');
const streamifier = require('streamifier'); // if not imported already

// ✅ Upload PDF Order
router.post('/upload', upload.single('order'), async (req, res) => {
  try {
    console.log("➡️ Upload route hit");

    if (!req.file) {
      return res.status(400).json({ error: 'No PDF uploaded' });
    }

    const bufferStream = Readable.from(req.file.buffer);

    const cloudResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'lawgikalai-orders',
          resource_type: 'raw',
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

    const fileName = req.file.originalname;
    const inlineUrl = cloudResult.secure_url.replace('/upload/', '/upload/fl_attachment:false/');
    const embedUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(inlineUrl)}`;

    // ✅ Save to DB with inline preview link
    const newOrder = new Order({
      title: req.body.title || 'Untitled',
      file_name: fileName,
      file_url: inlineUrl
    });

    await newOrder.save();

    // ✅ Keep response structure same, only return embed_url
    res.json({
      message: 'Order uploaded and saved successfully!',
      order: {
        file_name: fileName,
        embed_url: embedUrl
      }
    });

  } catch (err) {
    console.error('❌ Upload error:', err);
    res.status(500).json({ error: 'Something broke!', details: err.message });
  }
});
// Upload PDF route
router.post('/upload-document', upload.single('document'), async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: 'raw',
    });

    res.json({
      message: 'File uploaded successfully',
      file_name: req.file.originalname,
      file_url: result.secure_url,
    });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed', details: err.message });
  }
});
// Upload PDF to Cloudinary and save in DB
// ✅ Upload Multiple PDFs for Case
router.post('/upload-pdf', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No document uploaded' });
    }

    const bufferStream = Readable.from(req.file.buffer);

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'lawgikalai-documents',
          resource_type: 'raw',
          public_id: req.file.originalname.replace(/\.[^/.]+$/, '').replace(/\s+/g, '_'),
          use_filename: true,
          unique_filename: false
        },
        (err, uploadResult) => {
          if (err) return reject(err);
          resolve(uploadResult);
        }
      );

      bufferStream.pipe(stream);
    });

    const fileName = req.file.originalname;
    const cloudinaryRawUrl = result.secure_url;
    const embedUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(cloudinaryRawUrl)}`;

    // ✅ Response without file_url
    res.json({
      documents: [
        {
          file_name: fileName,
          embed_url: embedUrl
        }
      ],
      message: 'Document uploaded successfully!'
    });

  } catch (err) {
    console.error('❌ Upload error:', err);
    res.status(500).json({ error: 'Upload failed', details: err.message });
  }
});

// ✅ Get Orders by optional title
router.get('/', async (req, res) => {
  try {
    const { title } = req.query;

    const query = {};
    if (title) {
      query.title = { $regex: new RegExp(title, 'i') }; // case-insensitive partial match
    }

    const orders = await Order.find(query).sort({ createdAt: -1 });

    res.json({
      message: 'Orders fetched successfully',
      count: orders.length,
      data: orders
    });
  } catch (err) {
    console.error('❌ Error fetching orders:', err);
    res.status(500).json({ error: 'Failed to fetch orders', details: err.message });
  }
});


module.exports = router;
