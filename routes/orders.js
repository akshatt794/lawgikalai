const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Ensure the uploads/orders directory exists
const ordersDir = path.join(__dirname, '..', 'uploads', 'orders');
if (!fs.existsSync(ordersDir)) {
  fs.mkdirSync(ordersDir, { recursive: true });
}

// Multer setup for orders
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/orders/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// POST /api/orders/upload
router.post('/upload', upload.single('order'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No PDF uploaded' });
  }

  // You can store order info in DB if needed, for now just return info
  const baseUrl = process.env.BASE_URL || 'https://lawgikalai-auth-api.onrender.com';
  const fileUrl = `${baseUrl}/uploads/orders/${req.file.filename}`;

  res.json({
    title: req.body.title || "",
    file_name: req.file.originalname,
    file_url: fileUrl,
    message: "Order uploaded successfully!"
  });
});

module.exports = router;
