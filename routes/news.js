const express = require("express");
const multer = require("multer");
const News = require("../models/News");
const { uploadToS3, getPresignedUrl } = require("../utils/s3Client");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() }); // store in memory buffer

// ----------------------
// 1️⃣ Upload News
// ----------------------
router.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const { title, content, category, source } = req.body;

    if (!title || !content)
      return res.status(400).json({ error: "Title and content are required" });

    let imageKey = null;

    if (req.file) {
      imageKey = await uploadToS3(req.file, "news");
    }

    const news = new News({
      title,
      content,
      category,
      source,
      image_url: imageKey, // store S3 key path only
    });

    await news.save();

    res
      .status(201)
      .json({ ok: true, message: "News uploaded successfully", news });
  } catch (err) {
    console.error("❌ Upload News Error:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// ----------------------
// 2️⃣ Get All News
// ----------------------
router.get("/", async (req, res) => {
  try {
    const newsList = await News.find().sort({ createdAt: -1 }).lean();

    const newsWithUrls = await Promise.all(
      newsList.map(async (n) => {
        let image = null;
        if (n.image_url) {
          image = await getPresignedUrl(n.image_url);
        }
        return { ...n, image };
      })
    );

    res.json({ ok: true, news: newsWithUrls });
  } catch (err) {
    console.error("❌ Fetch All News Error:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// ----------------------
// 3️⃣ Get Single News Details
// ----------------------
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const news = await News.findById(id).lean();

    if (!news) return res.status(404).json({ error: "News not found" });

    let image = null;
    if (news.image_url) image = await getPresignedUrl(news.image_url);

    res.json({ ok: true, news: { ...news, image } });
  } catch (err) {
    console.error("❌ Fetch Single News Error:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

module.exports = router;
