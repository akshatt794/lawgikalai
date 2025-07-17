const express = require('express');
const router = express.Router();
const Case = require('../models/Case'); // Make sure you have models/Case.js

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

// (You can add more case routes here...)

module.exports = router;
