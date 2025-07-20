const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  title: String,
  file_name: String,
  file_url: String,
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Order', orderSchema);
