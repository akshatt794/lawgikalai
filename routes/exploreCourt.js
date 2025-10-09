const express = require("express");
const router = express.Router();
const courtData = require("../data/courtData");
const districtCourtData = require("../data/districtCourtData");

router.get("/courts", (req, res) => {
    const { type } = req.query;

    if (!type || !courtData[type.toLowerCase()]) {
        return res.status(400).json({ error: "Invalid or missing court type" });
    }

    return res.status(200).json({
        message: "Fetched data successfully",
        data: courtData[type.toLowerCase()],
    });
});
// ✅ District Court Info API
router.get("/district", (req, res) => {
    res.json({
        message: "Click below to visit the official District Court portal.",
        link: "https://districts.ecourts.gov.in/",
    });
});

router.get("/get-link", async (req, res) => {
    try {
        const { label, zone } = req.query;

        if (!label || !zone) {
            return res
                .status(400)
                .json({ ok: false, error: "label and zone are required" });
        }

        const normalizedLabel = label.trim().toLowerCase();
        const normalizedZone = zone.trim().toUpperCase();

        let url = null;

        switch (normalizedLabel) {
            case "judges on leave":
                url = districtCourtData.judgesOnLeave[0][normalizedZone];
                break;
            case "judges list":
                url = districtCourtData.judgesList[0][normalizedZone];
                break;
            case "duty magistrate roster":
            case "duty magistrate roaster": // in case spelling varies
                url =
                    districtCourtData.dutyMagistrateRoaster[0][normalizedZone];
                break;
            default:
                return res
                    .status(404)
                    .json({
                        ok: false,
                        error: "Invalid label or no URL mapping found",
                    });
        }

        if (!url) {
            return res
                .status(404)
                .json({ ok: false, error: `No URL found for zone: ${zone}` });
        }

        console.log(`✅ [DEBUG] ${label} → ${zone} → ${url}`);
        return res.json({ ok: true, url });
    } catch (err) {
        console.error("❌ [ERROR] /get-link route:", err);
        return res.status(500).json({ ok: false, error: "Server error" });
    }
});

module.exports = router;
