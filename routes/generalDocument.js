const express = require("express");
const router = express.Router();
const multer = require("multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const GeneralDocument = require("../models/GeneralDocuments");

// 🔹 Use memory storage for file buffer
const upload = multer({ storage: multer.memoryStorage() });

// 🔹 Initialize AWS S3 v3 client
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// ✅ Upload Route
router.post("/upload", upload.single("pdf"), async (req, res) => {
    try {
        console.log("➡️ General Document upload hit");

        const { title, category } = req.body;
        const file = req.file;

        if (!title || !category || !file) {
            return res.status(400).json({ error: "All fields are required" });
        }

        // Validate category
        const validCategories = ["BareAct", "CriminalLaw", "Event", "Forms"];
        if (!validCategories.includes(category)) {
            return res.status(400).json({ error: "Invalid category" });
        }

        // 🔹 Folder in S3 based on category
        const folder = category.toLowerCase();
        const fileKey = `${folder}/${Date.now()}_${file.originalname.replace(
            /\s+/g,
            "_"
        )}`;

        // 🔹 Upload to S3
        const params = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: fileKey,
            Body: file.buffer,
            ContentType: file.mimetype,
        };

        await s3.send(new PutObjectCommand(params));

        // Construct file URL
        const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

        // 🔹 Save to MongoDB
        const newDoc = await GeneralDocument.create({
            title,
            category,
            file_name: file.originalname,
            file_url: fileUrl,
        });

        return res.status(201).json({
            status: true,
            message: "✅ File uploaded successfully!",
            data: newDoc,
        });
    } catch (err) {
        console.error("❌ Upload Error:", err);
        res.status(500).json({
            error: "Failed to upload document",
            details: err.message,
        });
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
        else if (type === "3") category = "Forms";
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
            Form: "Legal Forms",
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
