const express = require("express");
const router = express.Router();
const { OpenAI } = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to try GPT-5, fall back to GPT-4o-mini if unavailable
async function safeCompletion(messages) {
  try {
    return await openai.chat.completions.create({
      model: "gpt-5",
      messages,
      temperature: 0.7,
    });
  } catch (err) {
    if (err.error?.message?.includes("does not exist")) {
      console.warn("⚠️ gpt-5 not available, falling back to gpt-4o-mini");
      return await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
      });
    }
    throw err;
  }
}

router.post("/draft", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  try {
    const completion = await safeCompletion([
      { role: "user", content: prompt },
    ]);

    const draft = completion.choices[0].message.content;

    res.json({
      message: "Prompt generated successfully ✅",
      draft,
      model: completion.model, // useful to see which model was actually used
    });
  } catch (error) {
    console.error("OpenAI Error:", error);
    res.status(500).json({ error: "Failed to generate legal draft" });
  }
});

module.exports = router;
