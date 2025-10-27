const { Readable } = require("stream");
const express = require("express");
const router = express.Router();
const upload = require("../middleware/multer");
const Order = require("../models/Order");
const pdfParse = require("pdf-parse");
const osClient = require("../utils/osClient");
const path = require("path");
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const crypto = require("crypto");
const PdfDocument = require("../models/PdfDocument");
const { verifyToken } = require("../middleware/verifyToken");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// ✅ Utility: Upload to S3 (wrapped for reuse)
const s3 = new S3Client({ region: process.env.AWS_REGION });

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
    index: "orders",
    id: metadata.orderId,
    body: doc,
    refresh: true,
  });
}

// Helper: Generate presigned URL (valid 1 hour)
async function generatePresignedUrl(key) {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
  });
  return await getSignedUrl(s3, command, { expiresIn: 3600 });
}

// ✅ Upload PDF Order (uses S3)
router.post("/upload", upload.single("order"), async (req, res) => {
  try {
    console.log("➡️ Upload route hit");

    if (!req.file) {
      return res.status(400).json({ error: "No PDF uploaded" });
    }

    const s3Key = `orders/${Date.now()}_${req.file.originalname.replace(
      /\s+/g,
      "_"
    )}`;

    await uploadToS3(req.file.buffer, s3Key, req.file.mimetype);

    const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
    const embedUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(
      fileUrl
    )}`;

    const newOrder = new Order({
      title: req.body.title || "Untitled",
      file_name: req.file.originalname,
      file_url: embedUrl,
    });

    const savedOrder = await newOrder.save();

    await parseAndIndexPDF(req.file.buffer, {
      orderId: savedOrder._id.toString(),
      title: savedOrder.title,
      fileName: savedOrder.file_name,
      fileUrl: fileUrl,
      createdAt: savedOrder.createdAt,
      userId: req.user?.id,
    });

    res.json({
      message: "Order uploaded and saved successfully!",
      order: savedOrder,
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
      index: "orders",
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

// ✅ Get Orders by optional title
router.get("/", async (req, res) => {
  try {
    const { title } = req.query;
    const query = title ? { title: { $regex: new RegExp(title, "i") } } : {};
    const orders = await Order.find(query).sort({ createdAt: -1 });

    res.json({
      message: "Orders fetched successfully",
      count: orders.length,
      data: orders,
    });
  } catch (err) {
    console.error("❌ Error fetching orders:", err);
    res.status(500).json({
      error: "Failed to fetch orders",
      details: err.message,
    });
  }
});

// 🔍 Enhanced PDF search with snippet
router.get("/search", async (req, res) => {
  const { query, page = 1, limit = 10, relevance = "true" } = req.query;

  if (!query) return res.status(400).json({ error: "Missing search query" });

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const from = (pageNum - 1) * limitNum;
  const relevanceBool = String(relevance).toLowerCase() !== "false"; // true unless explicitly "false"

  // Base content query (case-insensitive + fuzzy)
  const contentQuery = {
    bool: {
      should: [
        {
          match: {
            content: {
              query: query,
              operator: "and",
              fuzziness: "AUTO",
            },
          },
        },
        {
          wildcard: {
            content: {
              value: `*${String(query).toLowerCase()}*`,
              case_insensitive: true,
            },
          },
        },
      ],
      minimum_should_match: 1,
    },
  };

  // If relevance=false, boost by proximity to "now" using a gaussian decay on the date field.
  // Tune `scale` to how quickly the date influence should fall off (e.g., "30d" → ~month window).
  const queryWithDateBoost = {
    function_score: {
      query: contentQuery,
      boost_mode: "multiply",
      score_mode: "multiply",
      functions: [
        {
          gauss: {
            uploaded_at: {
              origin: "now",
              scale: "30d",
              offset: "0d",
              decay: 0.5,
            },
          },
        },
      ],
    },
  };

  // For an unmistakable “closest to now” ordering when relevance=false,
  // we also add a secondary sort using a script that measures absolute time distance from now.
  const dateProximitySort = [
    { _score: "desc" },
    {
      _script: {
        type: "number",
        order: "asc",
        script: {
          source: "Math.abs(doc['uploaded_at'].value.millis - params.now)",
          params: { now: Date.now() },
        },
      },
    },
  ];

  try {
    const body = {
      // If relevance=true → plain content query; else → content + date boost
      query: relevanceBool ? contentQuery : queryWithDateBoost,
      highlight: {
        fields: {
          content: {
            fragment_size: 150,
            number_of_fragments: 1,
          },
        },
        pre_tags: ["<mark>"],
        post_tags: ["</mark>"],
      },
    };

    if (!relevanceBool) {
      body.sort = dateProximitySort;
    }

    const result = await osClient.search({
      index: "orders",
      from,
      size: limitNum,
      body,
    });

    const total =
      result.body?.hits?.total?.value ?? result.hits?.total?.value ?? 0;

    const hitsRaw = result.body?.hits?.hits || result.hits?.hits || [];

    const hits = hitsRaw.map((hit) => {
      const src = hit._source || {};
      const content = src.content || "";
      const regex = new RegExp(query, "gi");
      const occurrences = (content.match(regex) || []).length;

      const snippet =
        hit.highlight?.content?.[0] ||
        content
          .split(". ")
          .find((line) =>
            line.toLowerCase().includes(String(query).toLowerCase())
          ) ||
        "";

      return {
        id: hit._id,
        title: src.title,
        file_url: src.file_url,
        uploaded_at: src.uploaded_at,
        occurrences,
        snippet,
        _score: hit._score,
      };
    });

    // Keep your frequency tie‑breaker when relevance=true (content‑first).
    if (relevanceBool) {
      hits.sort((a, b) => b.occurrences - a.occurrences);
    }
    // When relevance=false, ordering already comes from ES/OpenSearch (score + date proximity).

    res.json({
      message: "Search fetched successfully",
      page: pageNum,
      limit: limitNum,
      total,
      results: hits,
    });
  } catch (error) {
    console.error("❌ Search error:", error);
    res.status(500).json({ error: "Search failed" });
  }
});

// Enhanced Result for AdvancedSearch
// 🔍 Enhanced PDF search with snippet + advanced filters
router.get("/adv-search", async (req, res) => {
  const {
    query,
    page = 1,
    limit = 10,
    relevance = "true",
    case_type,
    case_number,
    petitioner,
    judge,
    act,
    section,
  } = req.query;

  if (!query) return res.status(400).json({ error: "Missing search query" });

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const from = (pageNum - 1) * limitNum;
  const relevanceBool = String(relevance).toLowerCase() !== "false";

  const filters = [];
  if (case_type) filters.push({ match_phrase: { case_type } });
  if (case_number) filters.push({ match_phrase: { case_number } });
  if (petitioner) filters.push({ match_phrase: { petitioner } });
  if (judge) filters.push({ match_phrase: { judge_name: judge } });
  if (act) filters.push({ match_phrase: { act } });
  if (section) filters.push({ match_phrase: { section } });

  const contentQuery = {
    bool: {
      must: [
        {
          match: {
            content: {
              query,
              operator: "and",
              fuzziness: "AUTO",
            },
          },
        },
      ],
      filter: filters,
    },
  };

  try {
    const result = await osClient.search({
      index: "orders",
      from,
      size: limitNum,
      body: {
        query: contentQuery,
        highlight: {
          fields: { content: { fragment_size: 150, number_of_fragments: 1 } },
          pre_tags: ["<mark>"],
          post_tags: ["</mark>"],
        },
      },
    });

    const hits = result.body.hits.hits || [];

    const results = await Promise.all(
      hits.map(async (hit) => {
        const src = hit._source || {};
        const content = src.content || "";
        const regex = new RegExp(query, "gi");
        const occurrences = (content.match(regex) || []).length;
        const snippet =
          hit.highlight?.content?.[0] ||
          content
            .split(". ")
            .find((line) =>
              line.toLowerCase().includes(String(query).toLowerCase())
            ) ||
          "";

        // Generate 1-hour presigned URL if s3_key exists
        let file_url = null;
        if (src.s3_key) {
          const command = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: src.s3_key,
            ResponseContentDisposition: "inline",
            ResponseContentType: "application/pdf"
          });
          file_url = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour
        }

        return {
          id: hit._id,
          title: src.title || src.file_name || "Untitled",
          file_url,
          occurrences,
          snippet,
          uploaded_at: src.timestamp,
          _score: hit._score,
        };
      })
    );

    res.json({
      message: "Search fetched successfully",
      page: pageNum,
      limit: limitNum,
      total: result.body.hits.total.value,
      results,
    });
  } catch (error) {
    console.error("❌ Search error:", error);
    res.status(500).json({
      error: "Search failed",
      details: error.message,
    });
  }
});

// 🐞 Debug: View indexed OpenSearch documents
router.get("/debug-index", async (req, res) => {
  try {
    const response = await osClient.search({
      index: "orders",
      body: {
        query: { match_all: {} },
        size: 10,
      },
    });

    const results = response.body.hits.hits.map((hit) => hit._source);
    res.json(results);
  } catch (error) {
    console.error("❌ OpenSearch error:", error);
    res.status(500).json({ error: "Search failed" });
  }
});

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
