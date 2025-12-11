const mongoose = require('mongoose');

const pdfSchema = new mongoose.Schema({
  title: String,
  file_url: String,
  file_key: String,
  uploaded_at: { type: Date, default: Date.now },
  content: String
});

module.exports = mongoose.model('PdfDocument', pdfSchema);
