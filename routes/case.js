const express = require('express');
const router = express.Router();
const Case = require('../models/Case');
const verifyToken = require('../middleware/verifyToken');
const jwt = require('jsonwebtoken'); // required for legacy fallback

// ✅ Utility to generate case_id
function generateCaseId() {
  const date = new Date();
  const yyyymmdd = date.toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `CASE-${yyyymmdd}-${random}`;
}

// ✅ Add Case API (Protected)
router.post('/add', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const caseData = {
      ...req.body,
      case_id: generateCaseId(),
      userId
    };

    const newCase = new Case(caseData);
    await newCase.save();

    res.json({ message: 'Case added successfully', case: newCase });
  } catch (err) {
    res.status(500).json({ error: "Something broke!", details: err.message });
  }
});

// ✅ Get case list for logged-in user with status filter
router.get('/list', verifyToken, async (req, res) => {
  try {
    const { status } = req.query;

    // Build filter: always filter by user
    const filter = { userId: req.user.userId };

    // Apply status filter if needed
    if (status && status !== 'All') {
      filter.case_status = status; // Expected: "Ongoing" or "Closed"
    }

    const cases = await Case.find(filter).select(
      'case_id case_title client_info.client_name court_name hearing_details.next_hearing_date case_status'
    );

    res.json({
      message: 'Cases fetched successfully',
      count: cases.length,
      data: cases,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});


// ✅ Edit a case by ID (if user owns it)
router.put('/:caseId', verifyToken, async (req, res) => {
  try {
    const { caseId } = req.params;

    const updated = await Case.findOneAndUpdate(
      { case_id: caseId, userId: req.user.userId },
      { $set: req.body },
      { new: true }
    );

    if (!updated)
      return res.status(404).json({ error: "Case not found or not allowed" });

    res.json({ message: "Case updated", case: updated });
  } catch (err) {
    res.status(500).json({ error: "Failed to update case", details: err.message });
  }
});

// ✅ Get details of a case by ID (if needed, auth can be re-enabled)
router.get('/:caseId', verifyToken, async (req, res) => {
  try {
    const caseDetails = await Case.findOne({
      case_id: req.params.caseId,
      userId: req.user.userId
    });

    if (!caseDetails) {
      return res.status(404).json({ error: "Case not found" });
    }

    res.json(caseDetails);
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
});



module.exports = router;
