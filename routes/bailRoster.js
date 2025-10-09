const express = require("express");
const router = express.Router();
const upload = require("../middleware/multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const BailRoster = require("../models/BailRoster");

const s3 = new S3Client({ region: process.env.AWS_REGION });

// ✅ Upload helper
async function uploadToS3(buffer, key, contentType) {
    const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
    };
    await s3.send(new PutObjectCommand(params));
}

// ✅ POST /api/bailroster/upload
router.post("/upload", upload.single("file"), async (req, res) => {
    try {
        console.log("➡️ Bail Roster upload hit");

        const { zone } = req.body;
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
// Always return the most recent file per zone (latest by createdAt)
router.get("/", async (req, res) => {
    try {
        const { zone } = req.query;
        const filter = zone ? { zone: zone.toUpperCase() } : {};

        // If zone provided → return the latest one
        if (zone) {
            const latestRoster = await BailRoster.findOne(filter)
                .sort({ createdAt: -1 })
                .lean();
            if (!latestRoster)
                return res
                    .status(404)
                    .json({ error: "No bail roster found for this zone" });

            return res.json({
                message: "Latest bail roster fetched successfully",
                data: latestRoster,
            });
        }

        // If no zone → return latest document for each zone
        const latestRosters = await BailRoster.aggregate([
            {
                $sort: { createdAt: -1 },
            },
            {
                $group: {
                    _id: "$zone",
                    latestRoster: { $first: "$$ROOT" },
                },
            },
            {
                $replaceRoot: { newRoot: "$latestRoster" },
            },
            {
                $sort: { zone: 1 },
            },
        ]);

        res.json({
            message: "Latest bail rosters fetched successfully for all zones",
            count: latestRosters.length,
            data: latestRosters,
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
