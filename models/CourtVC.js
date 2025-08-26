// models/CourtVC.js
const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    designation: String,
    jurisdiction: String,
    courtName: { type: String, required: true, trim: true },
    courtRoom: String,
    vcLink: String,
    vcMeetingId: String,
    vcEmail: String,
    district: { type: String, default: 'Delhi' },
    zone: String,
    location: String,
    source: {
      name: String,
      url: String,
      capturedAt: Date
    }
  },
  { timestamps: true }
);

schema.index({ name: 1, courtName: 1, courtRoom: 1, vcLink: 1 }, { unique: true, partialFilterExpression: { name: { $type: 'string' } } });
schema.index({ name: 'text', designation: 'text', jurisdiction: 'text', courtName: 'text', courtRoom: 'text', vcLink: 'text', vcMeetingId: 'text', vcEmail: 'text', district: 'text', zone: 'text', location: 'text' });

module.exports = mongoose.model('CourtVC', schema);
