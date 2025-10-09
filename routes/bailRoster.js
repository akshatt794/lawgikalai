// routes/bailRoster.js
const express = require("express");
const router = express.Router();
const upload = require("../middleware/multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const BailRoster = require("../models/BailRoster");

// Initialize S3 client
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

// ✅ POST /api/bailroster/upload
router.post("/upload", upload.single("file"), async (req, res) => {
    try {
        console.log("➡️ Bail Roster upload hit");

        const {
            judicial_officer,
            first_link_officer,
            second_link_officer,
            police_station,
            zone,
        } = req.body;

        if (!req.file)
            return res.status(400).json({ error: "No file uploaded" });
        if (!zone) return res.status(400).json({ error: "Zone is required" });

        const safeZone = zone.trim().replace(/\s+/g, "_").toUpperCase();
        const fileKey = `bailroster/${safeZone}/${Date.now()}_${req.file.originalname.replace(
            /\s+/g,
            "_"
        )}`;

        await uploadToS3(req.file.buffer, fileKey, req.file.mimetype);

        const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

        const newRoster = new BailRoster({
            judicial_officer,
            first_link_officer,
            second_link_officer,
            police_station,
            zone: zone.toUpperCase(),
            file_name: req.file.originalname,
            file_url: fileUrl,
        });

        const saved = await newRoster.save();

        res.json({
            message: "✅ Bail roster uploaded successfully",
            data: saved,
        });
    } catch (err) {
        console.error("❌ Bail Roster upload error:", err);
        res.status(500).json({
            error: "Failed to upload bail roster",
            details: err.message,
        });
    }
});

// ✅ GET /api/bailroster
// Optional ?zone= filter
router.get("/", async (req, res) => {
    try {
        const { zone } = req.query;
        const filter = zone ? { zone: zone.toUpperCase() } : {};
        const rosters = await BailRoster.find(filter).sort({ createdAt: -1 });

        res.json({
            message: "Bail rosters fetched successfully",
            count: rosters.length,
            data: rosters,
        });
    } catch (err) {
        console.error("❌ Error fetching bail rosters:", err);
        res.status(500).json({
            error: "Failed to fetch bail rosters",
            details: err.message,
        });
    }
});

module.exports = router;
