const express = require("express");
const router = express.Router();
const { OpenAI } = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper: safely call OpenAI with model + fallback
async function safeCompletion(messages) {
  try {
    return await openai.chat.completions.create({
      model: "gpt-5",
      messages,
      // gpt-5 (preview) might not support custom temperature, so omit it
    });
  } catch (err) {
    const msg = err.error?.message || err.message || "";
    if (msg.includes("does not exist") || msg.includes("access")) {
      console.warn("⚠️ gpt-5 not available, falling back to gpt-4o-mini");
      return await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7, // gpt-4o-mini supports it
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
    const completion = await safeCompletion([{ role: "user", content: prompt }]);
    const draft = completion.choices[0].message.content;

    res.json({
      message: "Prompt generated successfully ✅",
      draft,
      model: completion.model,
    });
  } catch (error) {
    console.error("OpenAI Error:", JSON.stringify(error, null, 2));
    res.status(500).json({
      error: error.error?.message || error.message || "Failed to generate legal draft",
    });
  }
});

module.exports = router;
