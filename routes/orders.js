const { Readable } = require('stream');
const express = require('express');
const router = express.Router();
const upload = require('../middleware/multer');
const Order = require('../models/Order');
const pdfParse = require('pdf-parse');
const osClient = require('../utils/osClient');
const s3 = require('../config/s3');
const path = require('path');

// Helper to parse and index PDF
async function parseAndIndexPDF(fileBuffer, metadata) {
  const data = await pdfParse(fileBuffer);

  const doc = {
    _id: metadata.orderId,
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
    refresh: true // ✅ ensure document is searchable immediately
  });
}

// ✅ Upload PDF Order (uses S3 now)
router.post('/upload', upload.single('order'), async (req, res) => {
  try {
    console.log("➡️ Upload route hit");

    if (!req.file) {
      return res.status(400).json({ error: 'No PDF uploaded' });
    }

    // Upload to S3
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

    // Save in MongoDB
    const newOrder = new Order({
      title: req.body.title || 'Untitled',
      file_name: req.file.originalname,
      file_url: embedUrl
    });

    const savedOrder = await newOrder.save();

    // Index into OpenSearch
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

// Upload Single PDF (Cloudinary)
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

// Upload Multiple PDFs (Cloudinary)
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
      query.title = { $regex: new RegExp(title, 'i') };
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

// 🔍 Enhanced PDF search with snippet
router.get('/search', async (req, res) => {
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Missing search query' });
  }

  try {
    const result = await osClient.search({
      index: 'pdf_documents',
      size: 50,
      query: {
        match: {
          content: {
            query: query,
            operator: "and"
          }
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
    });

    const hits = result.hits.hits.map(hit => {
      const content = hit._source.content || '';
      const regex = new RegExp(query, 'gi');
      const occurrences = (content.match(regex) || []).length;

      const snippet =
        hit.highlight && hit.highlight.content
          ? hit.highlight.content[0]
          : content.split('. ').find(line => line.toLowerCase().includes(query.toLowerCase())) || '';

      return {
        id: hit._id,
        title: hit._source.title,
        file_url: hit._source.file_url,
        uploaded_at: hit._source.uploaded_at,
        occurrences,
        snippet
      };
    });

    // Sort manually by how many times word appears
    hits.sort((a, b) => b.occurrences - a.occurrences);

    res.json(hits);
  } catch (error) {
    console.error('❌ Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// 🐞 Temporary: Debug to see what's in the index
router.get('/debug-index', async (req, res) => {
  try {
    const response = await osClient.search({
      index: 'orders',
      body: {
        query: {
          match_all: {}
        },
        size: 10
      }
    });

    const results = response.body.hits.hits.map(hit => hit._source);
    res.json(results);
  } catch (err) {
    console.error('Debug fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch index', details: err.message });
  }
});
app.listen(3000, '0.0.0.0', () => {
  console.log('✅ Server running on port 3000');
});


module.exports = router;
