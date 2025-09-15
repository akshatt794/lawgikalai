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
      model: "gpt-5", // or gpt-4/gpt-4o if enabled
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const draft = completion.choices[0].message.content;

    res.json({
      message: "Prompt generated successfully ✅",
      draft,
    });
  } catch (error) {
    console.error("OpenAI Error:", error);
    res.status(500).json({ error: "Failed to generate legal draft" });
  }
});

module.exports = router;
