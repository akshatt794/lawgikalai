const { Readable } = require('stream');
const express = require('express');
const router = express.Router();
const upload = require('../middleware/multer');
const Order = require('../models/Order');
const pdfParse = require('pdf-parse');
const osClient = require('../utils/osClient');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');
const PdfDocument = require('../models/PdfDocument');

// ✅ OpenSearch PDF Indexing Helper
async function parseAndIndexPDF(fileBuffer, metadata) {
  const data = await pdfParse(fileBuffer);

  const doc = {
    title: metadata.title,
    file_name: metadata.fileName,
    file_url: metadata.fileUrl,
    content: data.text,
    createdAt: metadata.createdAt,
    uploaded_by: metadata.userId || 'anonymous',
    uploaded_at: new Date().toISOString()
  };

  return await osClient.index({
    index: 'orders',
    id: metadata.orderId,
    body: doc,
    refresh: true
  });
}

// ✅ Upload PDF Order (uses S3)
router.post('/upload', upload.single('order'), async (req, res) => {
  try {
    console.log("➡️ Upload route hit");

    if (!req.file) {
      return res.status(400).json({ error: 'No PDF uploaded' });
    }

    const s3Key = `orders/${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;

    await uploadToS3(req.file.buffer, s3Key, req.file.mimetype);

    const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
    const embedUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(fileUrl)}`;

    const newOrder = new Order({
      title: req.body.title || 'Untitled',
      file_name: req.file.originalname,
      file_url: embedUrl
    });

    const savedOrder = await newOrder.save();

    await parseAndIndexPDF(req.file.buffer, {
      orderId: savedOrder._id.toString(),
      title: savedOrder.title,
      fileName: savedOrder.file_name,
      fileUrl: fileUrl,
      createdAt: savedOrder.createdAt,
      userId: req.user?.id
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

// ✅ Upload Single PDF (Cloudinary)
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

// ✅ Upload PDF (S3) & Index Content
router.post('/upload-pdf', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No document uploaded' });

    const parsed = await pdfParse(req.file.buffer);
    const key = `documents/${crypto.randomUUID()}_${req.file.originalname.replace(/\s+/g, '_')}`;

    await uploadToS3(req.file.buffer, key, 'application/pdf');

    const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    const doc = new PdfDocument({
      title: req.file.originalname,
      file_url: fileUrl,
      content: parsed.text
    });
    await doc.save();

    res.json({
      message: 'PDF uploaded and indexed successfully!',
      document: {
        title: doc.title,
        file_url: doc.file_url,
        uploaded_at: doc.uploaded_at
      }
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
    const query = title ? { title: { $regex: new RegExp(title, 'i') } } : {};
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

// 🔍 Enhanced PDF search with snippet
router.get('/search', async (req, res) => {
  const { query, page = 1, limit = 10 } = req.query;

  if (!query) return res.status(400).json({ error: 'Missing search query' });

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const from = (pageNum - 1) * limitNum;

  try {
    const result = await osClient.search({
      index: 'orders',
      from,
      size: limitNum,
      body: {
        query: {
          bool: {
            should: [
              {
                match: {
                  content: {
                    query: query,
                    operator: "and",
                    fuzziness: "AUTO"
                  }
                }
              },
              {
                wildcard: {
                  content: {
                    value: `*${query.toLowerCase()}*`,
                    case_insensitive: true
                  }
                }
              }
            ]
          }
        },
        highlight: {
          fields: {
            content: {
              fragment_size: 150,
              number_of_fragments: 1
            }
          },
          pre_tags: ['<mark>'],
          post_tags: ['</mark>']
        }
      }
    });

    const hits = result.body.hits.hits.map(hit => {
      const content = hit._source.content || '';
      const regex = new RegExp(query, 'gi');
      const occurrences = (content.match(regex) || []).length;

      const snippet =
        hit.highlight?.content?.[0] ||
        content
          .split('. ')
          .find(line => line.toLowerCase().includes(query.toLowerCase())) || '';

      return {
        id: hit._id,
        title: hit._source.title,
        file_url: hit._source.file_url,
        uploaded_at: hit._source.uploaded_at,
        occurrences,
        snippet
      };
    });

    hits.sort((a, b) => b.occurrences - a.occurrences);

    res.json(
      Object.assign(
        { message: 'Search fetched successfully' },
        {
          page: pageNum,
          limit: limitNum,
          results: hits
        }
      )
    );
    

  } catch (error) {
    console.error('❌ Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// 🐞 Debug: View indexed OpenSearch documents
router.get('/debug-index', async (req, res) => {
  try {
    const response = await osClient.search({
      index: 'orders',
      body: {
        query: { match_all: {} },
        size: 10
      }
    });

    const results = response.body.hits.hits.map(hit => hit._source);
    res.json(results);

  } catch (error) {
    console.error('❌ OpenSearch error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ✅ Utility: Upload to S3 (wrapped for reuse)
const s3 = new S3Client({ region: process.env.AWS_REGION });

async function uploadToS3(buffer, key, contentType) {
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType
  };

  return await s3.send(new PutObjectCommand(params));
}

module.exports = router;

