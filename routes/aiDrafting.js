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
    // Set headers for a live stream response
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // 🧩 Create streaming completion
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      messages: [{ role: "user", content: prompt }],
    });

    let fullDraft = "";

    for await (const chunk of stream) {
      const content = chunk.choices?.[0]?.delta?.content || "";
      if (content) {
        fullDraft += content;
        res.write(content); // Send token-by-token
      }
    }

    // End the stream
    res.end();

  } catch (error) {
    console.error("OpenAI Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate legal draft" });
    }
  }
});

module.exports = router;


module.exports = router;
