const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  title: { type: String, required: true },
  file_name: { type: String, required: true },
  file_url: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
