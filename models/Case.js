const mongoose = require('mongoose');

const caseSchema = new mongoose.Schema({
  case_id: {
    type: String,
    unique: true
  },
  case_title: String,
  case_number: String,
  court_name: String,
  case_type: String,
  filing_date: Date,
  case_status: String,
  client_info: {
    client_name: String,
    contact_number: String
  },
  fir_details: {
    fir_number: String,
    police_station: String,
    district: String
  },
  legal_details: {
    under_section: String,
    description: String
  },
  documents: [
    {
      file_name: String,
      file_url: String
    }
  ],
  hearing_details: {
    next_hearing_date: Date,
    time: String,
    courtroom_number: String,
    note: String
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Case', caseSchema);
