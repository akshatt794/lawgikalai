// routes/causeList.js
const express = require("express");
const router = express.Router();

/**
 * GET /api/courts/cause-list
 * Handles ?type query:
 * - type=0 → only High Court
 * - type=1 → only District Courts
 * - no type → both
 */
router.get("/cause-list", (req, res) => {
    const { type } = req.query;

    const data = {
        high_court: [
            {
                court_id: "DHC-001",
                court_name: "Delhi High Court",
                link: "https://delhihighcourt.nic.in/app/online-causelist",
            },
        ],
        delhi_district_courts: [
            {
                court_id: "DDC-101",
                court_name: "South East Delhi District Court",
                link: "https://southeastdelhi.dcourts.gov.in/cause-list-%e2%81%84-daily-board/",
            },
            {
                court_id: "DDC-102",
                court_name: "South West Delhi District Court",
                link: "https://southwestdelhi.dcourts.gov.in/cause-list-%e2%81%84-daily-board/",
            },
            {
                court_id: "DDC-103",
                court_name: "South Delhi District Court",
                link: "https://southdelhi.dcourts.gov.in/cause-list-%e2%81%84-daily-board/",
            },
            {
                court_id: "DDC-104",
                court_name: "New Delhi District Court",
                link: "https://newdelhi.dcourts.gov.in/cause-list-%e2%81%84-daily-board/",
            },
            {
                court_id: "DDC-105",
                court_name: "Central Delhi District Court",
                link: "https://centraldelhi.dcourts.gov.in/cause-list-%e2%81%84-daily-board/",
            },
            {
                court_id: "DDC-106",
                court_name: "West Delhi District Court",
                link: "https://westdelhi.dcourts.gov.in/cause-list-%e2%81%84-daily-board/",
            },
            {
                court_id: "DDC-107",
                court_name: "East Delhi District Court",
                link: "https://eastdelhi.dcourts.gov.in/cause-list-%e2%81%84-daily-board/",
            },
            {
                court_id: "DDC-108",
                court_name: "North East Delhi District Court",
                link: "https://northeast.dcourts.gov.in/cause-list-%e2%81%84-daily-board/",
            },
            {
                court_id: "DDC-109",
                court_name: "Shahdara District Court",
                link: "https://shahdara.dcourts.gov.in/cause-list-%e2%81%84-daily-board/",
            },
            {
                court_id: "DDC-110",
                court_name: "Rohini Courts (North West Delhi)",
                link: "https://rohini.dcourts.gov.in/cause-list-%e2%81%84-daily-board/",
            },
            {
                court_id: "DDC-111",
                court_name: "North Delhi District Court",
                link: "https://northdelhi.dcourts.gov.in/cause-list-%e2%81%84-daily-board/",
            },
        ],
    };

    let filteredData;

    // 🔹 Handle filtering logic based on type
    if (type === "0") {
        filteredData = { high_court: data.high_court };
    } else if (type === "1") {
        filteredData = { delhi_district_courts: data.delhi_district_courts };
    } else {
        filteredData = data; // no type → return all
    }

    return res.json({
        message: "Cause list fetched successfully",
        data: filteredData,
    });
});

module.exports = router;
