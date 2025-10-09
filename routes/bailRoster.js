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

/**
 * @route POST /api/bailroster/upload
 * @desc Upload a bail roster PDF + multiple officers for a zone
 */
router.post("/upload", upload.single("file"), async (req, res) => {
    try {
        console.log("➡️ Bail Roster upload hit");

        const { zone, officers } = req.body;

        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        if (!zone) {
            return res.status(400).json({ error: "Zone is required" });
        }

        if (!officers) {
            return res.status(400).json({ error: "Officers data is required" });
        }

        // Parse officers JSON (sent as string from frontend)
        let officerData;
        try {
            officerData = JSON.parse(officers);
        } catch (err) {
            return res.status(400).json({ error: "Invalid officers format" });
        }

        if (!Array.isArray(officerData) || officerData.length === 0) {
            return res
                .status(400)
                .json({ error: "At least one officer entry is required" });
        }

        // 🔹 Upload file to S3
        const safeZone = zone.trim().replace(/\s+/g, "_").toUpperCase();
        const fileKey = `bailroster/${safeZone}/${Date.now()}_${req.file.originalname.replace(
            /\s+/g,
            "_"
        )}`;

        await uploadToS3(req.file.buffer, fileKey, req.file.mimetype);

        const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

        // 🔹 Save to MongoDB
        const newRoster = new BailRoster({
            zone: zone.toUpperCase(),
            file_name: req.file.originalname,
            file_url: fileUrl,
            officers: officerData, // 👈 array of officer entries
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

/**
 * @route GET /api/bailroster
 * @desc Fetch latest bail roster(s)
 *        - If ?zone provided → latest for that zone
 *        - Else → latest per zone
 */
router.get("/", async (req, res) => {
    try {
        const { zone } = req.query;
        const filter = zone ? { zone: zone.toUpperCase() } : {};

        if (zone) {
            // Get latest for given zone
            const latestRoster = await BailRoster.findOne(filter)
                .sort({ createdAt: -1 })
                .lean();

            if (!latestRoster) {
                return res
                    .status(404)
                    .json({ error: "No bail roster found for this zone" });
            }

            return res.json({
                message: `Latest bail roster fetched successfully for zone ${zone.toUpperCase()}`,
                data: latestRoster,
            });
        }

        // No zone → get latest for each zone
        const latestRosters = await BailRoster.aggregate([
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: "$zone",
                    latestRoster: { $first: "$$ROOT" },
                },
            },
            { $replaceRoot: { newRoot: "$latestRoster" } },
            { $sort: { zone: 1 } },
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
