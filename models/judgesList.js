const mongoose = require("mongoose");

const judgesListSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        designation_jurisdiction: {
            type: String,
            required: true,
            trim: true,
        },
        court_room: {
            type: String,
            required: true,
            trim: true,
        },
        vc_link: {
            type: String,
            required: false,
            trim: true,
        },
        vc_meeting_id_email: {
            type: String,
            required: false,
            trim: true,
        },
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
    },
    { timestamps: true }
);

module.exports = mongoose.model("JudgesList", judgesListSchema);
