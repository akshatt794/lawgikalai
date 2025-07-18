const express = require('express');
const router = express.Router();
const Case = require('../models/Case'); // Make sure you have models/Case.js
const verifyToken = require('../middleware/verifyToken'); // ✅ Import here

// Add Case API
router.post('/add', async (req, res) => {
  try {
    const caseData = req.body;
    const newCase = new Case(caseData);
    await newCase.save();
    res.json({ message: 'Case added successfully', case: newCase });
  } catch (err) {
    res.status(500).json({ error: "Something broke!", details: err.message });
  }
});
// JWT middleware
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Missing token' });
  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// 1. Get case list of user
router.get('/list', auth, async (req, res) => {
  try {
    // If you store userId in Case model, filter by req.user.userId
    // Otherwise, return all cases
    const cases = await Case.find({ user: req.user.userId }); // adjust filter as per your model
    res.json({ cases });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// 2. Edit a case by ID (must belong to user)
router.put('/:caseId', auth, async (req, res) => {
  try {
    const { caseId } = req.params;
    const updated = await Case.findOneAndUpdate(
      { _id: caseId, createdBy: req.user.userId },
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
// GET CASE DETAILS BY ID
router.get('/:caseId', /*auth,*/ async (req, res) => {
  try {
    const caseId = req.params.caseId;
    const caseDetails = await Case.findById(caseId);

    if (!caseDetails) {
      return res.status(404).json({ error: "Case not found" });
    }

    res.json(caseDetails);
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// (You can add more case routes here...)

module.exports = router;
