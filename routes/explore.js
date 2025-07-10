const express = require('express');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const Explore = require('../models/Explore');
const router = express.Router();

// Cloudinary config (add your keys to .env)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'explore_pdfs',
    resource_type: 'raw', // allow pdf, doc, etc
    format: async (req, file) => 'pdf',
    public_id: (req, file) => Date.now() + '-' + file.originalname,
  },
});
const upload = multer({ storage });

router.post('/upload', upload.single('pdf'), async (req, res) => {
  const { title } = req.body;
  if (!req.file || !title) return res.status(400).json({ error: "Missing PDF or title" });
  const pdfUrl = req.file.path;
  const explore = await Explore.create({ title, pdfUrl });
  res.json({ message: "PDF uploaded!", data: explore });
});

module.exports = router;
