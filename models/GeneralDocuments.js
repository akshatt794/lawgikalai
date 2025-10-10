// models/Document.js
const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        category: {
            type: String,
            required: true,
            enum: ["BareAct", "CriminalLaw", "Event"],
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
        timestamps: true,
    }
);

module.exports = mongoose.model("GeneralDocument", documentSchema);
