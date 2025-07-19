const express = require("express");
const router = express.Router();
const { OpenAI } = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post("/draft", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // or "gpt-3.5-turbo" if gpt-4 is not available
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const draft = completion.choices[0].message.content;
    res.json({ draft });
  } catch (error) {
    console.error("OpenAI Error:", error); // ← Add this for debugging
    res.status(500).json({ error: "Failed to generate legal draft" });
  }
});

module.exports = router;
