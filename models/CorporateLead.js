const mongoose = require("mongoose");

const corporateLeadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    organization: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      default: "",
    },

    // Admin side fields
    status: {
      type: String,
      enum: ["new", "contacted", "converted", "closed"],
      default: "new",
    },
    notes: {
      type: String,
      default: "",
    },

    source: {
      type: String,
      default: "corporate_page",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("CorporateLead", corporateLeadSchema);
