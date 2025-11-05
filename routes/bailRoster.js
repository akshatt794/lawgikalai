const express = require("express");
const router = express.Router();
const upload = require("../middleware/multer");
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const BailRoster = require("../models/BailRoster");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

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

    // Helper: generate presigned URL
    async function generatePresignedUrl(key) {
      const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
      });
      return await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hr
    }
    // Helper: extract S3 key safely from URL
    function extractS3Key(fileUrl) {
      if (!fileUrl) return null;
      try {
        const url = new URL(fileUrl);
        const parts = url.pathname.split("/").filter(Boolean);

        // Case 1: virtual-hosted → no bucket in path
        if (!parts[0].includes(process.env.S3_BUCKET_NAME)) {
          return parts.join("/");
        }

        // Case 2: path-style → remove bucket from path
        return parts.slice(1).join("/");
      } catch {
        return null;
      }
    }

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

      const key = extractS3Key(latestRoster.file_url);
      if (!key) throw new Error("Invalid file URL");

      const presignedUrl = await generatePresignedUrl(key);
      latestRoster.presigned_url = presignedUrl;

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

    // Attach presigned URLs for each roster
    const dataWithUrls = await Promise.all(
      latestRosters.map(async (r) => {
        const key = extractS3Key(r.file_url);
        if (!key) return r;
        const presignedUrl = await generatePresignedUrl(key);
        return { ...r, presigned_url: presignedUrl };
      })
    );

    res.json({
      message: "Latest bail rosters fetched successfully for all zones",
      count: dataWithUrls.length,
      data: dataWithUrls,
    });
  } catch (err) {
    console.error("❌ Error fetching bail rosters:", err);
    res.status(500).json({
      error: "Failed to fetch bail rosters",
      details: err.message,
    });
  }
});

/* ==========================================================
   ✅ UPDATED: GET /api/bailroster/all (Paginated)
   ========================================================== */
router.get("/all", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await BailRoster.countDocuments();
    const rosters = await BailRoster.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    if (!rosters.length) {
      return res.json({
        message: "No bail rosters found.",
        count: 0,
        currentPage: page,
        totalPages: 0,
        data: [],
      });
    }

    async function generatePresignedUrl(key) {
      const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
      });
      return await getSignedUrl(s3, command, { expiresIn: 3600 });
    }

    function extractS3Key(fileUrl) {
      try {
        const url = new URL(fileUrl);
        const parts = url.pathname.split("/").filter(Boolean);
        if (!parts[0].includes(process.env.S3_BUCKET_NAME))
          return parts.join("/");
        return parts.slice(1).join("/");
      } catch {
        return null;
      }
    }

    const dataWithUrls = await Promise.all(
      rosters.map(async (r) => {
        const key = extractS3Key(r.file_url);
        const presignedUrl = key ? await generatePresignedUrl(key) : null;
        return { ...r, presigned_url: presignedUrl };
      })
    );

    res.json({
      message: "✅ All bail rosters fetched successfully.",
      count: total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      data: dataWithUrls,
    });
  } catch (err) {
    console.error("❌ Error fetching all bail rosters:", err);
    res.status(500).json({
      error: "Failed to fetch all bail rosters",
      details: err.message,
    });
  }
});

/**
 * @route DELETE /api/bailroster/:id
 * @desc Delete a bail roster by ID (and remove file from S3)
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Roster ID is required." });
    }

    // Find roster
    const roster = await BailRoster.findById(id);
    if (!roster) {
      return res.status(404).json({ error: "Bail roster not found." });
    }

    // 🪣 Extract S3 key
    const extractS3Key = (fileUrl) => {
      if (!fileUrl) return null;
      try {
        const url = new URL(fileUrl);
        const parts = url.pathname.split("/").filter(Boolean);
        if (!parts[0].includes(process.env.S3_BUCKET_NAME)) {
          return parts.join("/");
        }
        return parts.slice(1).join("/");
      } catch {
        return null;
      }
    };

    const fileKey = extractS3Key(roster.file_url);

    // 🧹 Delete file from S3 if key exists
    if (fileKey) {
      try {
        const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
        await s3.send(
          new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: fileKey,
          })
        );
        console.log(`🗑️ Deleted file from S3: ${fileKey}`);
      } catch (s3Err) {
        console.warn("⚠️ Failed to delete file from S3:", s3Err.message);
      }
    }

    // 🗑️ Delete document from MongoDB
    await BailRoster.findByIdAndDelete(id);

    res.json({
      message: "✅ Bail roster deleted successfully.",
      deletedId: id,
    });
  } catch (err) {
    console.error("❌ Error deleting bail roster:", err);
    res.status(500).json({
      error: "Failed to delete bail roster",
      details: err.message,
    });
  }
});

module.exports = router;
