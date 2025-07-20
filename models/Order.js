const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  title: { type: String },
  file_name: { type: String, required: true },
  file_url: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
