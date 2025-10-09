// models/BailRoster.js
const mongoose = require("mongoose");

const bailRosterSchema = new mongoose.Schema({
    judicial_officer: { type: String, required: true },
    first_link_officer: { type: String, required: false },
    second_link_officer: { type: String, required: false },
    police_station: { type: String, required: false },
    zone: {
        type: String,
        required: true,
        enum: [
            "NORTH",
            "NORTH WEST",
            "SHAHDARA",
            "EAST",
            "NORTH EAST",
            "WEST",
            "CENTRAL",
            "SOUTH WEST",
            "SOUTH",
            "SOUTH EAST",
            "NEW DELHI",
            "CBI",
        ],
    },
    file_name: { type: String, required: true },
    file_url: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("BailRoster", bailRosterSchema);
