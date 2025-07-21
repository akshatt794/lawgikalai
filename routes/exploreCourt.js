const express = require('express');
const router = express.Router();
const courtData = require('../data/courtData');

router.get('/courts', (req, res) => {
  const { type } = req.query;

  if (!type || !courtData[type.toLowerCase()]) {
    return res.status(400).json({ error: 'Invalid or missing court type' });
  }

  return res.status(200).json({
    message: "Fetched data successfully",
    data: courtData[type.toLowerCase()]
  });
});
// ✅ District Court Info API
router.get('/district', (req, res) => {
  res.json({
    message: "Click below to visit the official District Court portal.",
    link: "https://districts.ecourts.gov.in/"
  });
});

module.exports = router;
