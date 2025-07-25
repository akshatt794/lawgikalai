const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  title: String,
  category: String,
  date: String,
  source: String,
  summary: String,
  fullUpdate: String,
  sc_said: String,
  announced_by: String,
  applies_to: String,
  legal_impact: String,
  legal_sections: [String],
  image_url: String,
  file_name: String
}, { timestamps: true }); // ✅ Adds createdAt & updatedAt automatically

module.exports = mongoose.model('News', newsSchema);
