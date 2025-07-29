const { Readable } = require('stream');
const express = require('express');
const router = express.Router();
const upload = require('../middleware/multer');
const Order = require('../models/Order');
const pdfParse = require('pdf-parse');
const osClient = require('../utils/osClient');
const s3 = require('../config/s3'); // ✅ added
const path = require('path');

// Helper to parse and index PDF
async function parseAndIndexPDF(fileBuffer, metadata) {
  const data = await pdfParse(fileBuffer);

  const doc = {
    title: metadata.title,
    uploaded_by: metadata.userId,
    uploaded_at: new Date().toISOString(),
    content: data.text,
    file_url: metadata.fileUrl
  };

  return await osClient.index({
    index: 'pdf_documents',
    body: doc
  });
}

// ✅ Upload PDF Order (uses S3 now)
router.post('/upload', upload.single('order'), async (req, res) => {
  try {
    console.log("➡️ Upload route hit");

    if (!req.file) {
      return res.status(400).json({ error: 'No PDF uploaded' });
    }

    // S3 Upload
    const s3Key = `orders/${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;
    const s3Upload = await s3.upload({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: 'public-read'
    }).promise();

    const fileUrl = s3Upload.Location;
    const embedUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(fileUrl)}`;

    // Save in DB
    const newOrder = new Order({
      title: req.body.title || 'Untitled',
      file_name: req.file.originalname,
      file_url: embedUrl
    });

    const savedOrder = await newOrder.save();

    // Index content to OpenSearch
    await parseAndIndexPDF(req.file.buffer, {
      title: newOrder.title,
      fileUrl: fileUrl,
      userId: req.user?.id || 'anonymous'
    });

    res.json({
      message: 'Order uploaded and saved successfully!',
      order: savedOrder
    });

  } catch (err) {
    console.error('❌ Upload error:', err);
    res.status(500).json({ error: 'Something broke!', details: err.message });
  }
});

// Upload PDF route (still uses Cloudinary)
router.post('/upload-document', upload.single('document'), async (req, res) => {
  try {
    const cloudinary = require('../config/cloudinary');
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

// Upload Multiple PDFs for Case (still uses Cloudinary)
router.post('/upload-pdf', upload.single('document'), async (req, res) => {
  try {
    const cloudinary = require('../config/cloudinary');
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

// 🔍 Search PDFs by content
router.get('/search', async (req, res) => {
  const { query } = req.query;

  if (!query) return res.status(400).json({ error: 'Search query is required' });

  try {
    const result = await osClient.search({
      index: 'pdf_documents',
      body: {
        query: {
          match: {
            content: query
          }
        }
      }
    });

    const hits = result.body.hits.hits.map(hit => hit._source);

    res.json({
      message: 'Search completed successfully',
      count: hits.length,
      results: hits
    });
  } catch (err) {
    console.error('❌ Search failed:', err);
    res.status(500).json({ error: 'Search failed', details: err.message });
  }
});

module.exports = router;
