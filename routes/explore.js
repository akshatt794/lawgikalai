const express = require("express");
const router = express.Router();
const upload = require("../middleware/multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const Explore = require("../models/Explore");

const s3 = new S3Client({ region: process.env.AWS_REGION });

// 🔹 Helper to upload file to S3
async function uploadToS3(buffer, key, contentType) {
    const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
    };
    await s3.send(new PutObjectCommand(params));
}

// ===============================
// 📤 POST /api/explore/upload
// ===============================
router.post("/upload", upload.single("pdf"), async (req, res) => {
    try {
        console.log("➡️ Explore form upload hit");

        const { title } = req.body;
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }
        if (!title || title.trim() === "") {
            return res.status(400).json({ error: "Title is required" });
        }

        // Safe filename & key
        const safeTitle = title.trim().replace(/\s+/g, "_");
        const fileKey = `forms/${Date.now()}_${safeTitle}_${req.file.originalname.replace(
            /\s+/g,
            "_"
        )}`;

        // Upload to S3
        await uploadToS3(req.file.buffer, fileKey, req.file.mimetype);

        const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

        // Save record in MongoDB
        const newForm = new Explore({
            title: title.trim(),
            file_name: req.file.originalname,
            file_url: fileUrl,
        });

        const savedForm = await newForm.save();

        res.json({
            message: "✅ Form uploaded successfully!",
            data: savedForm,
        });
    } catch (err) {
        console.error("❌ Explore form upload error:", err);
        res.status(500).json({
            error: "Failed to upload form",
            details: err.message,
        });
    }
});

// ===============================
// 📥 GET /api/explore
// Optional ?title= query param
// ===============================
router.get("/", async (req, res) => {
    try {
        const { title } = req.query;
        const query = title
            ? { title: { $regex: new RegExp(title, "i") } }
            : {};

        const forms = await Explore.find(query).sort({ createdAt: -1 });

        if (!forms.length)
            return res.status(404).json({ message: "No forms found" });

        res.json({
            message: "📄 Forms fetched successfully",
            count: forms.length,
            data: forms,
        });
    } catch (err) {
        console.error("❌ Error fetching forms:", err);
        res.status(500).json({
            error: "Failed to fetch forms",
            details: err.message,
        });
    }
});

module.exports = router;
