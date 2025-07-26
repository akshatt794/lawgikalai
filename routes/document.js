const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const fs = require('fs'); // <-- add this

// === Step 2: Create uploads/documents folder if not exists ===
const documentsDir = path.join(__dirname, '..', 'uploads', 'documents');
if (!fs.existsSync(documentsDir)) {
  fs.mkdirSync(documentsDir, { recursive: true });
}
// Set storage for documents
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/documents/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Document Upload API
router.post('/upload-document', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No document uploaded' });
  }

  // Adjust BASE_URL if deploying
  const baseUrl = process.env.BASE_URL || 'https://lawgikalai-auth-api.onrender.com';
  const fileUrl = `${baseUrl}/uploads/documents/${req.file.filename}`;

  res.json({
    documents: [
      {
        file_name: req.file.originalname,
        file_url: fileUrl
      }
    ],
    message: "Document uploaded successfully!"
  });
});

module.exports = router;
