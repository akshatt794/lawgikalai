const express = require('express');
const multer = require('multer');
const extractTextFromPDF = require('../utils/pdfParser');
const esClient = require('../utils/esClient');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/parse', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No PDF uploaded' });

    const text = await extractTextFromPDF(req.file.buffer);

    // 🔍 Push to Elasticsearch
    await esClient.index({
      index: 'pdf-files',
      document: {
        filename: req.file.originalname,
        uploadedAt: new Date(),
        content: text
      }
    });

    res.json({ message: 'PDF parsed and indexed', filename: req.file.originalname });
  } catch (err) {
    console.error('❌ PDF parse/index error:', err);
    res.status(500).json({ error: 'Failed to parse or index PDF' });
  }
});

module.exports = router;
