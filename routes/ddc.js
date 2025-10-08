// routes/ddc.js
const express = require("express");
const router = express.Router();
const DdcDoc = require("../models/DdcDoc");
const Joi = require("joi");
const multer = require("multer");
const axios = require("axios"); // for remote download (optional)
const pdf = require("pdf-parse");

// If you have auth, uncomment and use it
// const verifyToken = require('../middleware/verifyToken');

const COMPLEX_ZONES = {
    ROHINI: ["NORTH", "NORTH WEST"],
    KARKARDOOMA: ["SHAHDARA", "EAST", "NORTH EAST"],
    "TIS HAZARI": ["WEST", "CENTRAL"],
    DWARKA: ["SOUTH WEST"],
    SAKET: ["SOUTH", "SOUTH EAST"],
    "PATIALA HOUSE": ["NEW DELHI"],
    "ROUSE AVENUE": ["CBI"],
};

const CATEGORIES = [
    { key: "JUDGES_LIST", label: "Judges List" },
    { key: "JUDGES_ON_LEAVE", label: "Judges On Leave" },
    { key: "BAIL_ROSTER", label: "Bail Roster" },
    { key: "DUTY_MAGISTRATE_ROSTER", label: "Duty Magistrate Roaster" },
];

// ---------- Multer (optional file upload) ----------
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 30 * 1024 * 1024 },
});

// ---------- OpenSearch (optional) ----------
const OS_URL = process.env.OPENSEARCH_URL; // e.g. https://your-os-domain/
const OS_INDEX = process.env.OPENSEARCH_INDEX || "ddc-docs";
const OS_AUTH = process.env.OPENSEARCH_BASIC_AUTH; // "user:pass", optional

async function osIndexDoc(id, body) {
    if (!OS_URL) return null;
    const url = `${OS_URL.replace(
        /\/$/,
        ""
    )}/${OS_INDEX}/_doc/${id}?refresh=true`;
    const headers = { "Content-Type": "application/json" };
    if (OS_AUTH)
        headers["Authorization"] =
            "Basic " + Buffer.from(OS_AUTH).toString("base64");
    await axios.put(url, body, { headers });
    return { index: OS_INDEX, osId: id };
}

async function osSearch(q, filter) {
    console.log(">>> osSearch called with:", q, opts);
    if (!OS_URL) return null;
    const url = `${OS_URL.replace(/\/$/, "")}/${OS_INDEX}/_search`;
    const headers = { "Content-Type": "application/json" };
    if (OS_AUTH)
        headers["Authorization"] =
            "Basic " + Buffer.from(OS_AUTH).toString("base64");

    const must = [
        { simple_query_string: { query: q, fields: ["title^2", "fullText"] } },
    ];
    if (filter.complex) must.push({ term: { complex: filter.complex } });
    if (filter.zone) must.push({ term: { zone: filter.zone } });
    if (filter.category) must.push({ term: { category: filter.category } });

    const body = {
        query: { bool: { must } },
        highlight: {
            fields: {
                fullText: { fragment_size: 140, number_of_fragments: 3 },
            },
        },
        size: filter.size || 20,
    };

    const { data } = await axios.post(url, body, { headers });
    return data;
}

// ---------- Validation ----------
const upsertSchema = Joi.object({
    complex: Joi.string()
        .valid(...Object.keys(COMPLEX_ZONES))
        .required(),
    zone: Joi.string().required(),
    category: Joi.string()
        .valid(
            "JUDGES_LIST",
            "JUDGES_ON_LEAVE",
            "BAIL_ROSTER",
            "DUTY_MAGISTRATE_ROSTER"
        )
        .required(),
    title: Joi.string().allow("", null),
    docDate: Joi.date().optional(),
    sourceUrl: Joi.string().uri().allow("", null),
    s3Url: Joi.string().uri().allow("", null),
    fileKey: Joi.string().allow("", null),
    // Either `file` (multipart) or `remoteUrl` or `s3Url`
    remoteUrl: Joi.string().uri().allow("", null),
});

// ---------- Helpers ----------
function fitsZone(complex, zone) {
    return (COMPLEX_ZONES[complex] || []).includes(zone);
}

function splitPages(textArr) {
    const fullText = textArr.join("\n\n");
    const pages = textArr.map((t, i) => ({ page: i + 1, text: t }));
    return { fullText, pages };
}

async function parsePdfFromBuffer(buf) {
    const pages = [];
    const data = await pdf(buf, {
        pagerender: (pageData) =>
            pageData.getTextContent().then((tc) => {
                const text = tc.items.map((i) => i.str).join(" ");
                pages.push(text);
                return text;
            }),
    });
    const { fullText, pages: pageObjs } = splitPages(
        pages.length ? pages : [data.text || ""]
    );
    return { fullText, pages: pageObjs };
}

function buildUI() {
    return Object.entries(COMPLEX_ZONES).map(([complex, zones]) => ({
        complex,
        zones: zones.map((z) => ({
            zone: z,
            categories: CATEGORIES,
        })),
    }));
}

// ---------- Public UI endpoints ----------
router.get("/ui", async (req, res) => {
    // verifyToken can be added if needed
    // e.g., router.get('/ui', verifyToken, async ...)
    res.json({ ok: true, structure: buildUI(), categories: CATEGORIES });
});

/**
 * GET /api/ddc/summary
 * For each (complex, zone, category) returns latest doc info (for the grey buttons).
 */
router.get("/summary", async (req, res) => {
    try {
        const agg = await DdcDoc.aggregate([
            {
                $group: {
                    _id: {
                        complex: "$complex",
                        zone: "$zone",
                        category: "$category",
                    },
                    latestDocDate: { $max: "$docDate" },
                    latestUpdatedAt: { $max: "$updatedAt" },
                    count: { $sum: 1 },
                },
            },
            {
                $project: {
                    _id: 0,
                    complex: "$_id.complex",
                    zone: "$_id.zone",
                    category: "$_id.category",
                    latestDocDate: 1,
                    latestUpdatedAt: 1,
                    count: 1,
                },
            },
            { $sort: { complex: 1, zone: 1, category: 1 } },
        ]);
        res.json({ ok: true, summary: agg });
    } catch (e) {
        console.error(e);
        res.status(500).json({ ok: false, error: "Server error" });
    }
});

/**
 * GET /api/ddc/docs
 * Filters: complex, zone, category, from, to
 */
router.get("/docs", async (req, res) => {
    try {
        const {
            complex,
            zone,
            category,
            from,
            to,
            page = 1,
            limit = 20,
        } = req.query;
        const q = {};
        if (complex) q.complex = complex;
        if (zone) q.zone = zone;
        if (category) q.category = category;
        if (from || to) {
            q.docDate = {};
            if (from) q.docDate.$gte = new Date(from);
            if (to) q.docDate.$lte = new Date(to);
        }

        const skip =
            (Math.max(parseInt(page), 1) - 1) * Math.max(parseInt(limit), 1);
        const [rows, total] = await Promise.all([
            DdcDoc.find(q)
                .sort({ docDate: -1, updatedAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            DdcDoc.countDocuments(q),
        ]);
        res.json({ ok: true, total, results: rows });
    } catch (e) {
        res.status(500).json({ ok: false, error: "Server error" });
    }
});

/**
 * /search - Filter by complex/zone/category only (no text search)
  /text-search - Full text search with optional filters
  /lookup - Wrapper around /text-search
 */

// TEXT SEARCH endpoint - search with query text
router.get("/text-search", async (req, res) => {
    try {
        const { q, complex, zone, category, size } = req.query;
        if (!q)
            return res
                .status(400)
                .json({ ok: false, error: "q is required, text-search" });

        // Prefer OpenSearch if present
        if (OS_URL) {
            const data = await osSearch(q, {
                complex,
                zone,
                category,
                size: Number(size) || 20,
            });
            const hits = (data?.hits?.hits || []).map((h) => ({
                id: h._id,
                score: h._score,
                complex: h._source.complex,
                zone: h._source.zone,
                category: h._source.category,
                title: h._source.title,
                docDate: h._source.docDate,
                s3Url: h._source.s3Url,
                highlights: h.highlight?.fullText || [],
            }));
            return res.json({ ok: true, engine: "opensearch", hits });
        }

        // Mongo text fallback
        const filter = {};
        if (complex) filter.complex = complex;
        if (zone) filter.zone = zone;
        if (category) filter.category = category;

        const rows = await DdcDoc.find({ $text: { $search: q }, ...filter })
            .select({
                score: { $meta: "textScore" },
                complex: 1,
                zone: 1,
                category: 1,
                title: 1,
                docDate: 1,
                s3Url: 1,
                fullText: 1,
            })
            .sort({ score: { $meta: "textScore" } })
            .limit(Number(size) || 20)
            .lean();

        // basic highlights
        const rgx = new RegExp(
            `(.{0,70})(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(.{0,70})`,
            "i"
        );
        const hits = rows.map((r) => {
            const m = r.fullText?.match(rgx);
            const snippet = m
                ? `${m[1]}${m[2]}${m[3]}`
                : (r.fullText || "").slice(0, 140);
            return {
                id: String(r._id),
                score: r.score,
                complex: r.complex,
                zone: r.zone,
                category: r.category,
                title: r.title,
                docDate: r.docDate,
                s3Url: r.s3Url,
                highlights: [snippet],
            };
        });

        res.json({ ok: true, engine: "mongo", hits });
    } catch (e) {
        console.error(e);
        res.status(500).json({ ok: false, error: "Server error" });
    }
});

// SEARCH endpoint - filter only (no text search)
router.get("/search", async (req, res) => {
    console.log("=== SEARCH ENDPOINT HIT ===");
    console.log("Query params:", req.query);

    try {
        const { q, complex, zone, category, size } = req.query;

        // Explicitly reject if 'q' is present
        if (q) {
            return res.status(400).json({
                ok: false,
                error: 'This endpoint does not accept "q" parameter. Use /text-search or /lookup for text queries.',
            });
        }

        // At least one filter must be provided
        if (!complex && !zone && !category) {
            return res.status(400).json({
                ok: false,
                error: "At least one filter (complex, zone, or category) is required",
            });
        }

        // Prefer OpenSearch if present
        if (OS_URL) {
            const must = [];
            if (complex) must.push({ term: { complex } });
            if (zone) must.push({ term: { zone } });
            if (category) must.push({ term: { category } });

            const url = `${OS_URL.replace(/\/$/, "")}/${OS_INDEX}/_search`;
            const headers = { "Content-Type": "application/json" };
            if (OS_AUTH) {
                headers["Authorization"] =
                    "Basic " + Buffer.from(OS_AUTH).toString("base64");
            }

            const body = {
                query: { bool: { must } },
                size: Number(size) || 20,
                sort: [{ docDate: { order: "desc" } }],
            };

            const { data } = await axios.post(url, body, { headers });
            const hits = (data?.hits?.hits || []).map((h) => ({
                id: h._id,
                score: h._score,
                complex: h._source.complex,
                zone: h._source.zone,
                category: h._source.category,
                title: h._source.title,
                docDate: h._source.docDate,
                s3Url: h._source.s3Url,
            }));
            return res.json({ ok: true, engine: "opensearch", hits });
        }

        // Mongo fallback
        const filter = {};
        if (complex) filter.complex = complex;
        if (zone) filter.zone = zone;
        if (category) filter.category = category;

        const rows = await DdcDoc.find(filter)
            .select({
                complex: 1,
                zone: 1,
                category: 1,
                title: 1,
                docDate: 1,
                s3Url: 1,
            })
            .sort({ docDate: -1 })
            .limit(Number(size) || 20)
            .lean();

        const hits = rows.map((r) => ({
            id: String(r._id),
            score: null,
            complex: r.complex,
            zone: r.zone,
            category: r.category,
            title: r.title,
            docDate: r.docDate,
            s3Url: r.s3Url,
        }));

        res.json({ ok: true, engine: "mongo", hits });
    } catch (e) {
        console.error(e);
        res.status(500).json({ ok: false, error: "Server error" });
    }
});

// LOOKUP endpoint - calls text-search
router.get("/lookup", async (req, res) => {
    console.log("=== LOOKUP ENDPOINT HIT ===");
    const { q } = req.query;
    if (!q)
        return res
            .status(400)
            .json({ ok: false, error: "q is required - lookup" });

    req.query.size = req.query.size || 10;
    const results = [];
    try {
        const { data } = await axios.get(
            `${req.protocol}://${req.get("host")}${req.baseUrl}/text-search`,
            { params: req.query }
        );
        for (const hit of data.hits || []) {
            results.push({
                id: hit.id,
                complex: hit.complex,
                zone: hit.zone,
                category: hit.category,
                title: hit.title,
                docDate: hit.docDate,
                s3Url: hit.s3Url,
                highlight: hit.highlights?.[0] || "",
            });
        }
        res.json({ ok: true, results });
    } catch (err) {
        console.error("Lookup error:", err.message);
        res.json({ ok: false, error: "lookup failed", details: err.message });
    }
});

/**
 * GET /api/ddc/docs/:id  (returns meta + pages if you want)
 */
router.get("/docs/:id", async (req, res) => {
    const row = await DdcDoc.findById(req.params.id).lean();
    if (!row) return res.status(404).json({ ok: false, error: "Not found" });
    res.json({ ok: true, result: row });
});

/**
 * POST /api/ddc/docs/upload
 * Accepts:
 *  - multipart file (field: file) OR
 *  - { remoteUrl } pointing to your S3/public PDF OR
 *  - { s3Url }
 * Body also needs: complex, zone, category, title?, docDate?, sourceUrl?, fileKey?
 */
router.post("/docs/upload", upload.single("file"), async (req, res) => {
    try {
        const body = { ...req.body };
        if (body.docDate) body.docDate = new Date(body.docDate);

        const { value, error } = upsertSchema.validate({
            ...body,
            remoteUrl: req.body.remoteUrl,
        });
        if (error)
            return res.status(400).json({ ok: false, error: error.message });

        if (!fitsZone(value.complex, value.zone)) {
            return res.status(400).json({
                ok: false,
                error: `${value.zone} is not a valid zone for ${value.complex}`,
            });
        }

        // 1) get PDF buffer
        let buf = null;
        if (req.file?.buffer) buf = req.file.buffer;
        else if (value.remoteUrl) {
            const { data } = await axios.get(value.remoteUrl, {
                responseType: "arraybuffer",
            });
            buf = Buffer.from(data);
            if (!value.s3Url) value.s3Url = value.remoteUrl;
        } else if (value.s3Url) {
            const { data } = await axios.get(value.s3Url, {
                responseType: "arraybuffer",
            });
            buf = Buffer.from(data);
        } else {
            return res
                .status(400)
                .json({ ok: false, error: "Provide file, remoteUrl or s3Url" });
        }

        // 2) parse PDF => fullText + pages[]
        const { fullText, pages } = await parsePdfFromBuffer(buf);

        // 3) upsert row
        const payload = { ...value, fullText, pages };
        const key = {
            complex: value.complex,
            zone: value.zone,
            category: value.category,
            title: value.title || null,
            s3Url: value.s3Url || null,
        };

        let doc = await DdcDoc.findOneAndUpdate(
            key,
            { $set: payload },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // 4) optional OpenSearch
        if (OS_URL) {
            const osBody = {
                complex: doc.complex,
                zone: doc.zone,
                category: doc.category,
                title: doc.title,
                docDate: doc.docDate,
                s3Url: doc.s3Url,
                sourceUrl: doc.sourceUrl,
                fullText: doc.fullText,
            };
            const osRes = await osIndexDoc(String(doc._id), osBody);
            if (osRes) {
                doc.osIndex = osRes.index;
                doc.osId = osRes.osId;
                await doc.save();
            }
        }

        res.status(201).json({ ok: true, result: doc });
    } catch (e) {
        console.error("upload error", e);
        res.status(500).json({ ok: false, error: "Server error" });
    }
});

module.exports = router;
