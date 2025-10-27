const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
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

// ✅ Helper — Generate presigned URL
async function generatePresignedUrl(key) {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
  });
  return await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour
}

// ✅ Helper — Extract S3 key from file URL (works for both URL formats)
function extractS3Key(fileUrl) {
  if (!fileUrl) return null;
  try {
    const url = new URL(fileUrl);
    const parts = url.pathname.split("/").filter(Boolean);

    // Case 1: virtual-hosted → no bucket in path
    if (!parts[0].includes(process.env.S3_BUCKET_NAME)) {
      return parts.join("/");
    }

    // Case 2: path-style → remove bucket
    return parts.slice(1).join("/");
  } catch {
    return null;
  }
}

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
// 0 = Criminal Law, 1 = Bare Acts, 2 = Events 3 = Forms
router.get("/", async (req, res) => {
  try {
    const { type } = req.query; // 👈 from query params, e.g., ?type=0
    let category;

    // 🔹 Type → Category Mapping
    if (type === "0") category = "CriminalLaw";
    else if (type === "1") category = "BareAct";
    else if (type === "2") category = "Event";
    else if (type === "3") category = "Forms";
    else {
      return res.status(400).json({
        status: false,
        message:
          "Invalid or missing 'type' query. Use ?type=0 (CriminalLaw), ?type=1 (BareAct), ?type=2 (Event), ?type=3 (Forms).",
      });
    }

    // 🔹 Fetch from MongoDB
    const docs = await GeneralDocument.find({ category }).sort({
      createdAt: -1,
    });

    // 🔹 Generate presigned URLs
    const dataWithUrls = await Promise.all(
      docs.map(async (d) => {
        const key = extractS3Key(d.file_url);
        const presignedUrl = key ? await generatePresignedUrl(key) : d.file_url;
        return {
          id: d._id,
          title: d.title,
          file_name: d.file_name,
          file_url: presignedUrl,
          uploaded_on: d.createdAt,
        };
      })
    );

    // 🔹 Title Mapping
    const titleMap = {
      BareAct: "Bare Acts Library",
      CriminalLaw: "Criminal Law Resources",
      Event: "Legal Events and Conferences",
      Forms: "Legal Forms",
    };

    // 🔹 Response
    return res.status(200).json({
      status: true,
      message: "Documents fetched successfully",
      title: titleMap[category],
      data: {
        documents: dataWithUrls,
      },
    });
  } catch (err) {
    console.error("❌ Fetch Documents Error:", err);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch documents",
      error: err.message,
    });
  }
});

module.exports = router;
