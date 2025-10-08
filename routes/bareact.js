const { Readable } = require("stream");
const express = require("express");
const router = express.Router();
const upload = require("../middleware/multer");
const Bareact = require("../models/Bareact")
const pdfParse = require("pdf-parse");
const osClient = require("../utils/osClient");
const path = require("path");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const crypto = require("crypto");
const PdfDocument = require("../models/PdfDocument");
const { verifyToken } = require("../middleware/verifyToken");

// ✅ OpenSearch PDF Indexing Helper
async function parseAndIndexPDF(fileBuffer, metadata) {
    const data = await pdfParse(fileBuffer);

    const doc = {
        title: metadata.title,
        file_name: metadata.fileName,
        file_url: metadata.fileUrl,
        content: data.text,
        createdAt: metadata.createdAt,
        uploaded_by: metadata.userId || "anonymous",
        uploaded_at: new Date().toISOString(),
    };

    return await osClient.index({
        index: "bareacts",
        id: metadata.bareactId,
        body: doc,
        refresh: true,
    });
}

// ✅ Upload PDF bareacts (uses S3)
router.post("/upload", upload.single("bareact"), async (req, res) => {
    try {
        console.log("➡️ Upload route hit");

        if (!req.file) {
            return res.status(400).json({ error: "No PDF uploaded" });
        }

        const s3Key = `bareacts/${Date.now()}_${req.file.originalname.replace(
            /\s+/g,
            "_"
        )}`;

        await uploadToS3(req.file.buffer, s3Key, req.file.mimetype);

        const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
        const embedUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(
            fileUrl
        )}`;

        const newBareact = new Bareact({
            title: req.body.title || "Untitled",
            file_name: req.file.originalname,
            file_url: embedUrl,
        });

        const savedBareact = await newBareact.save();

        await parseAndIndexPDF(req.file.buffer, {
            bareactId: savedBareact._id.toString(),
            title: savedBareact.title,
            fileName: savedBareact.file_name,
            fileUrl: fileUrl,
            createdAt: savedBareact.createdAt,
            userId: req.user?.id,
        });

        res.json({
            message: "Bareact uploaded and saved successfully!",
            bareact: savedBareact,
        });
    } catch (err) {
        console.error("❌ Upload error:", err);
        res.status(500).json({
            error: "Something broke!",
            details: err.message,
        });
    }
});

// ✅ Upload Single PDF (Cloudinary)
router.post(
    "/upload-document",
    verifyToken,
    upload.single("document"),
    async (req, res) => {
        try {
            const cloudinary = require("../config/cloudinary");
            const result = await cloudinary.uploader.upload(req.file.path, {
                resource_type: "raw",
            });

            res.json({
                message: "File uploaded successfully",
                file_name: req.file.originalname,
                file_url: result.secure_url,
            });
        } catch (err) {
            res.status(500).json({
                error: "Upload failed",
                details: err.message,
            });
        }
    }
);

// Upload PDF (S3) & Index Content
// Upload PDF (S3) & Index Content (Mongo + OpenSearch); response unchanged
router.post("/upload-pdf", upload.single("document"), async (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ error: "No document uploaded" });

        // Upload to S3
        const key = `documents/${crypto.randomUUID()}_${req.file.originalname.replace(
            /\s+/g,
            "_"
        )}`;
        await uploadToS3(req.file.buffer, key, "application/pdf");
        const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

        // Parse and save to Mongo
        const parsed = await pdfParse(req.file.buffer);
        const doc = new PdfDocument({
            title: req.file.originalname,
            file_url: fileUrl,
            content: parsed.text,
        });
        await doc.save();

        // Index to OpenSearch so the message remains truthful and /search finds it
        await osClient.index({
            index: "bareacts",
            id: doc._id.toString(),
            body: {
                title: doc.title,
                file_name: req.file.originalname,
                file_url: fileUrl,
                content: parsed.text,
                createdAt: doc.createdAt,
                uploaded_by: req.user?.id || "anonymous",
                uploaded_at: new Date().toISOString(),
            },
            refresh: true,
        });

        // ⬇️ Response kept EXACTLY the same as before
        return res.json({
            message: "PDF uploaded and indexed successfully!",
            document: {
                title: doc.title,
                file_url: doc.file_url,
                uploaded_at: doc.uploaded_at,
            },
        });
    } catch (err) {
        console.error("❌ Upload error (/upload-pdf):", err);
        res.status(500).json({ error: "Upload failed", details: err.message });
    }
});

// ✅ Get Bareact by optional title
router.get("/", async (req, res) => {
    try {
        const { title } = req.query;
        const query = title
            ? { title: { $regex: new RegExp(title, "i") } }
            : {};
        const bareacts = await Bareact.find(query).sort({ createdAt: -1 });

        res.json({
            message: "Bareacts fetched successfully",
            count: bareacts.length,
            data: bareacts,
        });
    } catch (err) {
        console.error("❌ Error fetching bareacts:", err);
        res.status(500).json({
            error: "Failed to fetch bareacts",
            details: err.message,
        });
    }
});

// ✅ Utility: Upload to S3 (wrapped for reuse)
const s3 = new S3Client({ region: process.env.AWS_REGION });

async function uploadToS3(buffer, key, contentType) {
    const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
    };

    return await s3.send(new PutObjectCommand(params));
}

module.exports = router;
