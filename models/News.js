const mongoose = require("mongoose");

const newsSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    category: { type: String, default: "" },
    source: { type: String, default: "" },
    image_url: { type: String, default: null }, // actual S3 path (not presigned)
  },
  { timestamps: true } // adds createdAt, updatedAt
);

module.exports = mongoose.model("News", newsSchema);
