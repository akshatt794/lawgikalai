const mongoose = require('mongoose');

const exploreSchema = new mongoose.Schema({
  title: { type: String, required: true },
  pdfUrl: { type: String, required: true },
});

module.exports = mongoose.model('Explore', exploreSchema);
