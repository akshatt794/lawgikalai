const express = require("express");
const multer = require("multer");
const AWS = require("aws-sdk");
const GeneralDocument = require("../models/GeneralDocuments");

const router = express.Router();

// Multer setup
const storage = multer.memoryStorage();
const upload = multer({ storage });

// AWS S3 configuration
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
});

// ✅ Upload Route
router.post("/upload", upload.single("pdf"), async (req, res) => {
    try {
        const { title, category } = req.body;
        const file = req.file;

        if (!title || !category || !file) {
            return res.status(400).json({ error: "All fields are required" });
        }

        // Validate category
        const validCategories = ["BareAct", "CriminalLaw", "Event"];
        if (!validCategories.includes(category)) {
            return res.status(400).json({ error: "Invalid category" });
        }

        // Define folder name for S3
        const folder = category.toLowerCase();
        const key = `${folder}/${Date.now()}_${file.originalname}`;

        // ✅ Check file.buffer existence
        if (!file.buffer) {
            console.error("❌ File buffer missing. Check multer setup.");
            return res.status(400).json({ error: "File buffer missing" });
        }

        // ✅ Upload to S3
        const uploadParams = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
        };

        const s3Response = await s3.upload(uploadParams).promise();

        // ✅ Save to MongoDB
        const newDoc = await GeneralDocument.create({
            title,
            category,
            file_name: file.originalname,
            file_url: s3Response.Location,
        });

        res.status(201).json({
            status: true,
            message: "File uploaded successfully!",
            data: newDoc,
        });
    } catch (err) {
        console.error("❌ Upload Error:", err); // <-- This log is key
        res.status(500).json({ error: "Failed to upload document" });
    }
});

// 📥 GET DOCUMENTS
// 0 = Criminal Law, 1 = Bare Acts, 2 = Events
router.get("/:type", async (req, res) => {
    try {
        const { type } = req.params;
        let category;

        // Type Mapping
        if (type === "0") category = "CriminalLaw";
        else if (type === "1") category = "BareAct";
        else if (type === "2") category = "Event";
        else
            return res.status(400).json({
                message:
                    "Invalid type. Use 0 for CriminalLaw, 1 for BareAct, 2 for Event.",
            });

        const docs = await GeneralDocument.find({ category }).sort({
            createdAt: -1,
        });

        // Title Mapping
        const titleMap = {
            BareAct: "Bare Acts Library",
            CriminalLaw: "Criminal Law Resources",
            Event: "Legal Events and Conferences",
        };

        return res.status(200).json({
            message: "Documents fetched successfully",
            title: titleMap[category],
            data: {
                documents: docs.map((d) => ({
                    id: d._id,
                    title: d.title,
                    file_name: d.file_name,
                    file_url: d.file_url,
                    uploaded_on: d.createdAt,
                })),
            },
        });
    } catch (err) {
        console.error("Fetch Documents Error:", err);
        return res.status(500).json({
            message: "Failed to fetch documents",
            error: err.message,
        });
    }
});

module.exports = router;
