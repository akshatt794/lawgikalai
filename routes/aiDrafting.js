const express = require("express");
const router = express.Router();
const { OpenAI } = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post("/draft", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });

    // ❌ remove stream:true
    const completion = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [{ role: "user", content: prompt }],
    });

    const draft = completion.choices[0].message.content;
    res.json({ message: "Draft generated successfully", draft });
  } catch (error) {
    console.error("OpenAI Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate draft" });
    }
  }
});

module.exports = router;
