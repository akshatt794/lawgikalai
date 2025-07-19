const express = require('express');
const router = express.Router();

router.post('/register-token', async (req, res) => {
  const { userId, token } = req.body;

  if (!userId || !token) {
    return res.status(400).json({ error: "userId and token are required" });
  }

  try {
    // Save to DB or memory (for now)
    console.log(`Token saved: ${token} for user ${userId}`);
    res.status(200).json({ message: "Token registered successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
