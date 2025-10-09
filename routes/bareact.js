const express = require("express");
const router = express.Router();
const upload = require("../middleware/multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const Bareact = require("../models/Bareact");

const s3 = new S3Client({ region: process.env.AWS_REGION });

// ✅ Utility: Upload to S3
async function uploadToS3(buffer, key, contentType) {
    const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
    };
    return await s3.send(new PutObjectCommand(params));
}

/**
 * ✅ POST /api/bareact/upload
 * Upload a Bare Act file (PDF) with title.
 */
router.post("/upload", upload.single("file"), async (req, res) => {
    try {
        console.log("➡️ Bare Act upload hit");

        const { title } = req.body;
        if (!req.file)
            return res.status(400).json({ error: "No file uploaded" });
        if (!title) return res.status(400).json({ error: "Title is required" });

        // Safe file name
        const safeTitle = title.trim().replace(/\s+/g, "_");
        const fileKey = `bareacts/${safeTitle}/${Date.now()}_${req.file.originalname.replace(
            /\s+/g,
            "_"
        )}`;

        // Upload to S3
        await uploadToS3(req.file.buffer, fileKey, req.file.mimetype);

        // Get S3 file URL
        const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

        // Save to DB
        const newBareact = new Bareact({
            title: title.trim(),
            file_name: req.file.originalname,
            file_url: fileUrl,
        });

        const saved = await newBareact.save();

        res.json({
            message: "✅ Bare Act uploaded successfully!",
            data: saved,
        });
    } catch (err) {
        console.error("❌ Bare Act upload error:", err);
        res.status(500).json({
            error: "Failed to upload Bare Act",
            details: err.message,
        });
    }
});

/**
 * ✅ GET /api/bareact
 * Fetch all Bare Acts or search by title (optional ?title=)
 */
router.get("/", async (req, res) => {
    try {
        const { title } = req.query;
        const filter = title
            ? { title: { $regex: new RegExp(title, "i") } }
            : {};

        const acts = await Bareact.find(filter).sort({ createdAt: -1 });

        res.json({
            message: "Bare Acts fetched successfully",
            count: acts.length,
            data: acts,
        });
    } catch (err) {
        console.error("❌ Error fetching Bare Acts:", err);
        res.status(500).json({
            error: "Failed to fetch Bare Acts",
            details: err.message,
        });
    }
});

module.exports = router;
