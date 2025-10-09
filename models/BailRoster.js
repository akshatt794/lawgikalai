// models/BailRoster.js
const mongoose = require("mongoose");

const officerSchema = new mongoose.Schema({
    judicial_officer: { type: String, required: true },
    first_link_officer: { type: String },
    second_link_officer: { type: String },
    police_station: { type: String },
});

const bailRosterSchema = new mongoose.Schema(
    {
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

        // 🧩 Store multiple officers under one zone + file
        officers: [officerSchema],
    },
    { timestamps: true }
);

module.exports = mongoose.model("BailRoster", bailRosterSchema);
