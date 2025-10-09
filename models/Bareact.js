// models/Bareact.js
const mongoose = require("mongoose");

const bareactSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        file_name: {
            type: String,
            required: true,
        },
        file_url: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true, // Automatically adds createdAt & updatedAt
    }
);

module.exports = mongoose.model("Bareact", bareactSchema);
