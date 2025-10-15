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
    // ✅ Setup Server-Sent Events headers for live streaming
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // ✅ Request OpenAI stream
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      messages: [{ role: "user", content: prompt }],
    });

    for await (const chunk of stream) {
      const content = chunk.choices?.[0]?.delta?.content || "";
      if (content) {
        res.write(content);
      }
    }

    res.end(); // ✅ Close connection after stream ends
  } catch (error) {
    console.error("OpenAI Error:", error);
    if (!res.headersSent) {
      res
        .status(500)
        .json({ error: "Failed to generate legal draft", details: error.message });
    } else {
      res.end("Error: Unable to complete request.");
    }
  }
});

module.exports = router;
