const { Readable } = require('stream');
const express = require('express');
const router = express.Router();
const upload = require('../middleware/multer');
const cloudinary = require('../config/cloudinary');
const Order = require('../models/Order');

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

    // ✅ Modify URL to open in new tab (inline view)
    const inlineUrl = cloudResult.secure_url.replace('/upload/', '/upload/fl_attachment:false/');

    const newOrder = new Order({
      title: req.body.title || 'Untitled',
      file_name: req.file.originalname,
      file_url: inlineUrl
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

module.exports = router;
