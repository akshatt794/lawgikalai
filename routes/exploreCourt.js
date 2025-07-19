const express = require('express');
const router = express.Router();
const courtData = require('../data/courtData'); // Adjust the path if needed

router.get('/courts', (req, res) => {
  const { type } = req.query;

  if (!type || !courtData[type.toLowerCase()]) {
    return res.status(400).json({ error: 'Invalid or missing court type' });
  }

  return res.json(courtData[type.toLowerCase()]);
});

module.exports = router;
