// models/DdcDoc.js
const mongoose = require('mongoose');

const PAGE_LIMIT = 10000; // safety cap

const ddcDocSchema = new mongoose.Schema(
  {
    // --- Hierarchy ---
    complex: {
      type: String,
      required: true,
      enum: [
        'ROHINI',
        'KARKARDOOMA',
        'TIS HAZARI',
        'DWARKA',
        'SAKET',
        'PATIALA HOUSE',
        'ROUSE AVENUE'
      ]
    },
    zone: {
      type: String,
      required: true,
      // Examples below—use only those valid for the complex
      enum: [
        'NORTH', 'NORTH WEST',
        'SHAHDARA', 'EAST', 'NORTH EAST',
        'WEST', 'CENTRAL',
        'SOUTH WEST',
        'SOUTH', 'SOUTH EAST',
        'NEW DELHI',
        'CBI'
      ]
    },
    category: {
      type: String,
      required: true,
      enum: ['JUDGES_LIST', 'JUDGES_ON_LEAVE', 'BAIL_ROSTER', 'DUTY_MAGISTRATE_ROSTER']
    },

    // --- Document metadata ---
    title: { type: String, trim: true },
    docDate: { type: Date },                // date on PDF/notice
    sourceUrl: { type: String, trim: true },// DDC website link (optional)
    s3Url: { type: String, trim: true },    // your S3 object URL
    fileKey: { type: String, trim: true },  // optional S3 key

    // --- Text extraction result ---
    fullText: { type: String },             // full text for text index
    pages: [
      {
        page: { type: Number },
        text: { type: String, maxlength: PAGE_LIMIT }
      }
    ],

    // OpenSearch doc id (if indexed)
    osIndex: { type: String, trim: true },
    osId: { type: String, trim: true }
  },
  { timestamps: true }
);

// Fast filters & uniqueness (avoid duplicates for same publish)
ddcDocSchema.index({ complex: 1, zone: 1, category: 1, docDate: -1 });
ddcDocSchema.index(
  { complex: 1, zone: 1, category: 1, title: 1, s3Url: 1 },
  { unique: true, partialFilterExpression: { s3Url: { $type: 'string' } } }
);

// Text search fallback (Mongo)
ddcDocSchema.index({ fullText: 'text', title: 'text' });

module.exports = mongoose.model('DdcDoc', ddcDocSchema);
