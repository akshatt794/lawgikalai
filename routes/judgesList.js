const express = require("express");
const router = express.Router();
const Judge = require("../models/judgesList");

/**
 * ✅ POST /api/judges-list/add-multiple
 * Body: { judges: [{ name, designation_jurisdiction, court_room, vc_link, vc_meeting_id_email, zone }] }
 */
router.post("/add-multiple", async (req, res) => {
    try {
        const { judges } = req.body;

        if (!Array.isArray(judges) || judges.length === 0) {
            return res.status(400).json({ error: "No judges data provided." });
        }

        // Validate required fields
        const invalid = judges.find(
            (j) =>
                !j.name ||
                !j.designation_jurisdiction ||
                !j.court_room ||
                !j.zone
        );

        if (invalid) {
            return res.status(400).json({
                error: "Missing required fields in one or more entries.",
            });
        }

        // Normalize data (trim strings, uppercase zone)
        const prepared = judges.map((j) => ({
            ...j,
            name: j.name.trim(),
            designation_jurisdiction: j.designation_jurisdiction.trim(),
            court_room: j.court_room.trim(),
            vc_link: j.vc_link?.trim() || "",
            vc_meeting_id_email: j.vc_meeting_id_email?.trim() || "",
            zone: j.zone.trim().toUpperCase(),
        }));

        // Save all judges
        const savedJudges = await Judge.insertMany(prepared);

        res.status(201).json({
            message: "✅ Judges added successfully!",
            count: savedJudges.length,
            data: savedJudges,
        });
    } catch (err) {
        console.error("❌ Error adding judges:", err);
        res.status(500).json({
            error: "Failed to add judges.",
            details: err.message,
        });
    }
});

/* ==========================================================
   ✅ 1️⃣ GET /api/judges-list/by-name?name=xyz
   Search judges by name (case-insensitive partial match)
   ========================================================== */
router.get("/by-name", async (req, res) => {
    try {
        const { name } = req.query;

        if (!name || name.trim() === "") {
            return res
                .status(400)
                .json({ error: "Name parameter is required." });
        }

        const regex = new RegExp(name.trim(), "i"); // case-insensitive match

        const judges = await Judge.find({ name: regex }).sort({
            createdAt: -1,
        });

        if (!judges.length) {
            return res.json({
                message: "No judges found for this name.",
                count: 0,
                data: [],
            });
        }

        res.json({
            message: "Judges fetched successfully by name.",
            count: judges.length,
            data: judges,
        });
    } catch (err) {
        console.error("❌ Error fetching judges by name:", err);
        res.status(500).json({
            error: "Failed to fetch judges by name.",
            details: err.message,
        });
    }
});

/* ==========================================================
   ✅ 2️⃣ GET /api/judges-list/by-zone?zone=NORTH
   Fetch all judges from a specific zone
   ========================================================== */
router.get("/by-zone", async (req, res) => {
    try {
        const { zone } = req.query;

        if (!zone || zone.trim() === "") {
            return res
                .status(400)
                .json({ error: "Zone parameter is required." });
        }

        const normalizedZone = zone.trim().toUpperCase();

        const judges = await Judge.find({ zone: normalizedZone }).sort({
            createdAt: -1,
        });

        if (!judges.length) {
            return res.json({
                message: `No judges found for zone ${normalizedZone}.`,
                count: 0,
                data: [],
            });
        }

        res.json({
            message: `Judges fetched successfully for zone ${normalizedZone}.`,
            count: judges.length,
            data: judges,
        });
    } catch (err) {
        console.error("❌ Error fetching judges by zone:", err);
        res.status(500).json({
            error: "Failed to fetch judges by zone.",
            details: err.message,
        });
    }
});

module.exports = router;
