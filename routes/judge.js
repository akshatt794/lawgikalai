// routes/judgeSearch.js
const express = require("express");
const router = express.Router();
const DdcDoc = require("../models/DdcDoc");
const CourtVC = require("../models/CourtVC");
const axios = require("axios");

// OpenSearch configuration
const OS_URL = process.env.OPENSEARCH_URL;
const OS_INDEX = process.env.OPENSEARCH_INDEX || "ddc-docs";
const OS_AUTH = process.env.OPENSEARCH_BASIC_AUTH;

/**
 * OpenSearch query for judge information
 */
async function osSearchJudges(searchQuery, filters = {}) {
    if (!OS_URL) return null;

    const url = `${OS_URL.replace(/\/$/, "")}/${OS_INDEX}/_search`;
    const headers = { "Content-Type": "application/json" };
    if (OS_AUTH) {
        headers["Authorization"] =
            "Basic " + Buffer.from(OS_AUTH).toString("base64");
    }

    const must = [
        {
            simple_query_string: {
                query: searchQuery,
                fields: ["fullText^2", "title"],
                default_operator: "and",
            },
        },
    ];

    // Filter by category - only search in JUDGES_LIST documents
    must.push({ term: { category: "JUDGES_LIST" } });

    if (filters.complex) must.push({ term: { complex: filters.complex } });
    if (filters.zone) must.push({ term: { zone: filters.zone } });

    const body = {
        query: { bool: { must } },
        highlight: {
            fields: {
                fullText: {
                    fragment_size: 300,
                    number_of_fragments: 5,
                    pre_tags: ["<mark>"],
                    post_tags: ["</mark>"],
                },
            },
        },
        size: filters.size || 20,
    };

    try {
        const { data } = await axios.post(url, body, { headers });
        return data;
    } catch (err) {
        console.error("OpenSearch error:", err.response?.data || err.message);
        throw err;
    }
}

/**
 * Extract judge information from text snippet
 */
function extractJudgeInfo(text, searchTerm) {
    const judges = [];

    // Split text into paragraphs or sections
    const sections = text.split(/\n{2,}|\r\n{2,}/);

    for (const section of sections) {
        // Check if section contains the search term
        if (!section.toLowerCase().includes(searchTerm.toLowerCase())) {
            continue;
        }

        const lines = section
            .split(/\n|\r\n/)
            .map((l) => l.trim())
            .filter((l) => l);

        const judge = {
            name: null,
            designation: null,
            courtName: null,
            courtRoom: null,
            meetingLink: null,
            vcMeetingId: null,
        };

        let sectionText = section;

        // Extract Name (look for honorifics followed by name)
        const namePatterns = [
            /(?:Sh\.|Ms\.|Shri|Smt\.|Mr\.|Mrs\.|Justice|Hon'ble)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/,
            /(?:Judge|Magistrate)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
            /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)(?:\s*[-–]|\s*,|\s+(?:District|Additional|Metropolitan))/m,
        ];

        for (const pattern of namePatterns) {
            const match = sectionText.match(pattern);
            if (match) {
                judge.name = match[1].trim();
                break;
            }
        }

        // Extract Designation
        const designationPatterns = [
            /(?:District|Distt\.?)\s+(?:and\s+)?(?:Sessions?|Sess\.?)\s+Judge/i,
            /Additional\s+(?:District|Distt\.?)\s+(?:and\s+)?(?:Sessions?|Sess\.?)\s+Judge/i,
            /(?:Chief\s+)?Metropolitan\s+Magistrate/i,
            /Additional\s+Chief\s+Metropolitan\s+Magistrate/i,
            /Special\s+Judge/i,
            /Presiding\s+Officer/i,
            /(?:Senior\s+)?Civil\s+Judge/i,
        ];

        for (const pattern of designationPatterns) {
            const match = sectionText.match(pattern);
            if (match) {
                judge.designation = match[0].trim();
                break;
            }
        }

        // Extract Court Name
        const courtPatterns = [
            /Court\s+(?:No\.?|Number|#)\s*[:=-]?\s*([^\n,]+)/i,
            /(?:Special\s+)?Court\s+of\s+([^\n,]+)/i,
            /(?:^|\n)Court:\s*([^\n]+)/i,
        ];

        for (const pattern of courtPatterns) {
            const match = sectionText.match(pattern);
            if (match) {
                judge.courtName = match[1].trim();
                break;
            }
        }

        // Extract Court Room
        const roomPatterns = [
            /(?:Court\s+)?Room\s+(?:No\.?|Number|#)\s*[:=-]?\s*(\d+[A-Z]?)/i,
            /Chamber\s+(?:No\.?|Number|#)\s*[:=-]?\s*(\d+[A-Z]?)/i,
            /(?:^|\n)Room:\s*(\d+[A-Z]?)/i,
        ];

        for (const pattern of roomPatterns) {
            const match = sectionText.match(pattern);
            if (match) {
                judge.courtRoom = match[1].trim();
                break;
            }
        }

        // Extract Meeting Link (URLs)
        const urlMatch = sectionText.match(/(https?:\/\/[^\s\n,]+)/i);
        if (urlMatch) {
            judge.meetingLink = urlMatch[1].trim();
        }

        // Extract VC Meeting ID or Email
        const emailMatch = sectionText.match(
            /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
        );
        if (emailMatch) {
            judge.vcMeetingId = emailMatch[1].trim();
        } else {
            // Try to find meeting ID
            const meetingIdPatterns = [
                /(?:Meeting\s+ID|VC\s+ID|Video\s+Conference\s+ID)\s*[:=-]?\s*([^\n,]+)/i,
                /(?:^|\n)(?:ID|Meeting):\s*([^\n,]+)/i,
            ];

            for (const pattern of meetingIdPatterns) {
                const match = sectionText.match(pattern);
                if (match) {
                    judge.vcMeetingId = match[1].trim();
                    break;
                }
            }
        }

        // Only add if we found at least a name
        if (judge.name) {
            judges.push(judge);
        }
    }

    return judges;
}

/**
 * Parse full document text to extract all judges
 */
function parseJudgesFromDocument(fullText) {
    const judges = [];

    // Try to split by common patterns that separate judge entries
    const entries = fullText.split(
        /(?=\n(?:Sh\.|Ms\.|Shri|Smt\.|Mr\.|Mrs\.)\s+[A-Z])|(?=\n\d+\.\s+[A-Z])/
    );

    for (const entry of entries) {
        if (entry.trim().length < 20) continue; // Skip very short entries

        const lines = entry
            .split(/\n/)
            .map((l) => l.trim())
            .filter((l) => l);
        if (lines.length === 0) continue;

        const judge = {
            name: null,
            designation: null,
            courtName: null,
            courtRoom: null,
            meetingLink: null,
            vcMeetingId: null,
        };

        const text = entry;

        // Extract Name
        const nameMatch = text.match(
            /(?:Sh\.|Ms\.|Shri|Smt\.|Mr\.|Mrs\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/
        );
        if (nameMatch) {
            judge.name = nameMatch[1].trim();
        } else {
            // Try first line if it looks like a name
            const firstLine = lines[0];
            if (
                firstLine.match(
                    /^(?:\d+\.\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)$/
                )
            ) {
                judge.name = firstLine.replace(/^\d+\.\s+/, "").trim();
            }
        }

        // Extract Designation
        const designationMatch = text.match(
            /(?:District|Additional|Metropolitan|Special|Chief|Senior)\s+(?:District\s+)?(?:and\s+)?(?:Sessions?\s+)?(?:Judge|Magistrate|Officer)/i
        );
        if (designationMatch) {
            judge.designation = designationMatch[0].trim();
        }

        // Extract Court Name
        const courtMatch = text.match(
            /Court\s+(?:No\.?|Number)?\s*[:=-]?\s*([^\n]+)/i
        );
        if (courtMatch) {
            judge.courtName = courtMatch[1].trim().split(/[,\n]/)[0].trim();
        }

        // Extract Court Room
        const roomMatch = text.match(
            /(?:Room|Chamber)\s+(?:No\.?)?\s*[:=-]?\s*(\d+[A-Z]?)/i
        );
        if (roomMatch) {
            judge.courtRoom = roomMatch[1].trim();
        }

        // Extract Meeting Link
        const linkMatch = text.match(/(https?:\/\/[^\s\n]+)/);
        if (linkMatch) {
            judge.meetingLink = linkMatch[1].trim();
        }

        // Extract Email/Meeting ID
        const emailMatch = text.match(
            /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
        );
        if (emailMatch) {
            judge.vcMeetingId = emailMatch[1].trim();
        }

        if (judge.name) {
            judges.push(judge);
        }
    }

    return judges;
}

/**
 * GET /api/judge-search
 * Primary endpoint for searching judges
 * Query params:
 *   - q: search query (judge name, court room, etc.)
 *   - complex: filter by court complex (optional)
 *   - zone: filter by zone (optional)
 *   - limit: number of results (default: 20)
 */
router.get("/", async (req, res) => {
    try {
        const { q, complex, zone, limit = 20 } = req.query;

        if (!q || q.trim().length === 0) {
            return res.status(400).json({
                ok: false,
                error: 'Search query "q" is required',
            });
        }

        const searchTerm = q.trim();
        const filters = {
            complex,
            zone,
            size: parseInt(limit) || 20,
        };

        let results = [];
        let engine = "mongodb";

        // Try OpenSearch first
        if (OS_URL) {
            try {
                const osData = await osSearchJudges(searchTerm, filters);

                if (osData?.hits?.hits) {
                    engine = "opensearch";

                    for (const hit of osData.hits.hits) {
                        const doc = hit._source;
                        const highlights = hit.highlight?.fullText || [];

                        // Extract judges from highlights first (more relevant)
                        let judges = [];
                        for (const highlight of highlights) {
                            const extractedJudges = extractJudgeInfo(
                                highlight,
                                searchTerm
                            );
                            judges.push(...extractedJudges);
                        }

                        // If no judges found in highlights, parse full document
                        if (judges.length === 0 && doc.fullText) {
                            judges = parseJudgesFromDocument(doc.fullText);
                        }

                        // Add metadata to each judge
                        for (const judge of judges) {
                            results.push({
                                ...judge,
                                complex: doc.complex,
                                zone: doc.zone,
                                docTitle: doc.title,
                                docDate: doc.docDate,
                                sourceUrl: doc.sourceUrl,
                                s3Url: doc.s3Url,
                                documentId: hit._id,
                                relevanceScore: hit._score,
                            });
                        }
                    }
                }
            } catch (osErr) {
                console.error(
                    "OpenSearch failed, falling back to MongoDB:",
                    osErr.message
                );
                engine = "mongodb";
                results = []; // Reset results for MongoDB fallback
            }
        }

        // MongoDB fallback
        if (results.length === 0) {
            const query = {
                category: "JUDGES_LIST",
                $text: { $search: searchTerm },
            };

            if (complex) query.complex = complex;
            if (zone) query.zone = zone;

            const docs = await DdcDoc.find(query)
                .select({
                    score: { $meta: "textScore" },
                    complex: 1,
                    zone: 1,
                    title: 1,
                    docDate: 1,
                    sourceUrl: 1,
                    s3Url: 1,
                    fullText: 1,
                })
                .sort({ score: { $meta: "textScore" } })
                .limit(filters.size)
                .lean();

            for (const doc of docs) {
                if (!doc.fullText) continue;

                // Parse judges from document
                const judges = parseJudgesFromDocument(doc.fullText);

                // Filter judges that match the search term
                const matchingJudges = judges.filter((judge) => {
                    const searchLower = searchTerm.toLowerCase();
                    return (
                        judge.name?.toLowerCase().includes(searchLower) ||
                        judge.designation
                            ?.toLowerCase()
                            .includes(searchLower) ||
                        judge.courtName?.toLowerCase().includes(searchLower) ||
                        judge.courtRoom?.toLowerCase().includes(searchLower)
                    );
                });

                for (const judge of matchingJudges) {
                    results.push({
                        ...judge,
                        complex: doc.complex,
                        zone: doc.zone,
                        docTitle: doc.title,
                        docDate: doc.docDate,
                        sourceUrl: doc.sourceUrl,
                        s3Url: doc.s3Url,
                        documentId: String(doc._id),
                        relevanceScore: doc.score,
                    });
                }
            }
        }

        // Also search in CourtVC collection as supplementary data
        try {
            const courtVCQuery = {
                $text: { $search: searchTerm },
            };

            const courtVCResults = await CourtVC.find(courtVCQuery)
                .select({
                    score: { $meta: "textScore" },
                    name: 1,
                    designation: 1,
                    courtName: 1,
                    courtRoom: 1,
                    vcLink: 1,
                    vcMeetingId: 1,
                    vcEmail: 1,
                    zone: 1,
                    location: 1,
                    source: 1,
                })
                .sort({ score: { $meta: "textScore" } })
                .limit(10)
                .lean();

            for (const vc of courtVCResults) {
                results.push({
                    name: vc.name,
                    designation: vc.designation,
                    courtName: vc.courtName,
                    courtRoom: vc.courtRoom,
                    meetingLink: vc.vcLink,
                    vcMeetingId: vc.vcMeetingId || vc.vcEmail,
                    zone: vc.zone,
                    location: vc.location,
                    source: "CourtVC",
                    sourceUrl: vc.source?.url,
                    relevanceScore: vc.score,
                });
            }
        } catch (vcErr) {
            console.error("CourtVC search error:", vcErr.message);
            // Don't fail the entire request
        }

        // Remove duplicates based on name and court
        const uniqueResults = [];
        const seen = new Set();

        for (const result of results) {
            const key =
                `${result.name}-${result.courtName}-${result.courtRoom}`.toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                uniqueResults.push(result);
            }
        }

        // Sort by relevance score
        uniqueResults.sort(
            (a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0)
        );

        res.json({
            ok: true,
            engine,
            query: searchTerm,
            total: uniqueResults.length,
            results: uniqueResults.slice(0, filters.size),
        });
    } catch (err) {
        console.error("Judge search error:", err);
        res.status(500).json({
            ok: false,
            error: "Server error occurred while searching",
            message: err.message,
        });
    }
});

/**
 * GET /api/judge-search/by-complex
 * Get all judges grouped by complex and zone
 */
router.get("/by-complex", async (req, res) => {
    try {
        const { complex, zone } = req.query;

        const query = { category: "JUDGES_LIST" };
        if (complex) query.complex = complex;
        if (zone) query.zone = zone;

        const docs = await DdcDoc.find(query)
            .sort({ complex: 1, zone: 1, docDate: -1 })
            .lean();

        const grouped = {};

        for (const doc of docs) {
            if (!doc.fullText) continue;

            const key = `${doc.complex}-${doc.zone}`;
            if (!grouped[key]) {
                grouped[key] = {
                    complex: doc.complex,
                    zone: doc.zone,
                    judges: [],
                    documents: [],
                };
            }

            const judges = parseJudgesFromDocument(doc.fullText);
            grouped[key].judges.push(...judges);
            grouped[key].documents.push({
                id: String(doc._id),
                title: doc.title,
                docDate: doc.docDate,
                judgeCount: judges.length,
            });
        }

        res.json({
            ok: true,
            results: Object.values(grouped),
        });
    } catch (err) {
        console.error("Get by complex error:", err);
        res.status(500).json({
            ok: false,
            error: "Server error",
            message: err.message,
        });
    }
});

module.exports = router;
