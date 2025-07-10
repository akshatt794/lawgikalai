const mongoose = require('mongoose');
const exploreSchema = new mongoose.Schema({
  title: String,
  pdfUrl: String,
});
module.exports = mongoose.model('Explore', exploreSchema);
