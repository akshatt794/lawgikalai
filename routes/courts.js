const express = require('express');
const router = express.Router();

// ✅ District Court API
router.get('/district', (req, res) => {
  res.json({
    message: "Click below to visit the official District Court portal.",
    link: "https://districts.ecourts.gov.in/"
  });
});

module.exports = router;
