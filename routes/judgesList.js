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
      (j) => !j.name || !j.designation_jurisdiction || !j.court_room || !j.zone
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
      return res.status(400).json({ error: "Name parameter is required." });
    }

    const regex = new RegExp(name.trim(), "i"); // case-insensitive match

    const judges = await Judge.find({ name: regex }).sort({
      createdAt: 1,
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
      return res.status(400).json({ error: "Zone parameter is required." });
    }

    const normalizedZone = zone.trim().toUpperCase();

    const judges = await Judge.find({ zone: normalizedZone }).sort({
      createdAt: 1,
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

/* ==========================================================
   🗑️ DELETE /api/judges-list/delete/:id
   Delete a judge by ID
   ========================================================== */
router.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Judge ID is required." });
    }

    const deletedJudge = await Judge.findByIdAndDelete(id);

    if (!deletedJudge) {
      return res.status(404).json({ error: "Judge not found." });
    }

    res.json({
      message: "🗑️ Judge deleted successfully.",
      deletedId: id,
    });
  } catch (err) {
    console.error("❌ Error deleting judge:", err);
    res.status(500).json({
      error: "Failed to delete judge.",
      details: err.message,
    });
  }
});

/* ==========================================================
   ✅ UPDATED: GET /api/judges-list/all (Paginated)
   ========================================================== */
router.get("/all", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Judge.countDocuments();
    const judges = await Judge.find()
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    if (!judges.length) {
      return res.json({
        message: "No judges found.",
        count: 0,
        currentPage: page,
        totalPages: 0,
        data: [],
      });
    }

    res.json({
      message: "✅ All judges fetched successfully.",
      count: total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      data: judges,
    });
  } catch (err) {
    console.error("❌ Error fetching all judges:", err);
    res.status(500).json({
      error: "Failed to fetch judges.",
      details: err.message,
    });
  }
});

/* ==========================================================
   ✏️ PUT /api/judges-list/edit/:id
   Edit a judge by ID (from any zone)
   ========================================================== */
router.put("/edit/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      designation_jurisdiction,
      court_room,
      vc_link,
      vc_meeting_id_email,
      zone,
    } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Judge ID is required." });
    }

    // Find the existing judge
    const existingJudge = await Judge.findById(id);
    if (!existingJudge) {
      return res.status(404).json({ error: "Judge not found." });
    }

    // Prepare updated fields (only update provided ones)
    const updatedFields = {};

    if (name) updatedFields.name = name.trim();
    if (designation_jurisdiction)
      updatedFields.designation_jurisdiction = designation_jurisdiction.trim();
    if (court_room) updatedFields.court_room = court_room.trim();
    if (vc_link !== undefined) updatedFields.vc_link = vc_link?.trim() || "";
    if (vc_meeting_id_email !== undefined)
      updatedFields.vc_meeting_id_email = vc_meeting_id_email?.trim() || "";
    if (zone) updatedFields.zone = zone.trim().toUpperCase();

    // Update the judge
    const updatedJudge = await Judge.findByIdAndUpdate(id, updatedFields, {
      new: true,
      runValidators: true,
    });

    res.json({
      message: "✅ Judge updated successfully.",
      data: updatedJudge,
    });
  } catch (err) {
    console.error("❌ Error updating judge:", err);
    res.status(500).json({
      error: "Failed to update judge.",
      details: err.message,
    });
  }
});

module.exports = router;
