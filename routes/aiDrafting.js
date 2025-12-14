const express = require("express");
const router = express.Router();
const { OpenAI } = require("openai");
const { verifyToken } = require("../middleware/verifyToken");
const User = require("../models/User"); // 👈 import your user model
const { lightVerifyToken } = require("../middleware/lightVerifyToken");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ✅ Add verifyToken middleware to identify user
router.post("/draft", lightVerifyToken, async (req, res) => {
  const { prompt } = req.body;
  const userId = req.user.userId || req.user.id || req.user._id;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  try {
    // ✅ Find user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // ✅ Check & reset daily usage
    const today = new Date().toDateString();
    if (user.lastPromptDate !== today) {
      user.dailyPromptCount = 0;
      user.lastPromptDate = today;
    }

    // ✅ Enforce 5 prompts/day limit
    if (user.dailyPromptCount >= 5) {
      return res
        .status(429)
        .json({ error: "Daily AI draft limit reached (5 prompts/day)." });
    }

    // ✅ Increment usage
    user.dailyPromptCount += 1;
    await user.save();

    // ✅ Setup streaming headers
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
      if (content) res.write(content);
    }

    res.end();
  } catch (error) {
    console.error("OpenAI Error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: "Failed to generate legal draft",
        details: error.message,
      });
    } else {
      res.end("Error: Unable to complete request.");
    }
  }
});

//for mobile
// ✅ Mobile-friendly AI draft (non-streaming)
router.post("/draft/mobile", lightVerifyToken, async (req, res) => {
  const { prompt } = req.body;
  const userId = req.user.userId || req.user.id || req.user._id;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const today = new Date().toDateString();
    if (user.lastPromptDate !== today) {
      user.dailyPromptCount = 0;
      user.lastPromptDate = today;
    }

    if (user.dailyPromptCount >= 5) {
      return res
        .status(429)
        .json({ error: "Daily AI draft limit reached (5 prompts/day)." });
    }

    user.dailyPromptCount += 1;
    await user.save();

    // ✅ Use non-streaming completion
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    const result =
      completion.choices?.[0]?.message?.content || "No response generated.";

    res.setHeader("Content-Type", "application/json; charset=utf-8");

    return res.json({
      success: true,
      message: result,
      remaining: 5 - user.dailyPromptCount,
    });
  } catch (error) {
    console.error("Mobile OpenAI Error:", error);
    res.status(500).json({
      error: "Failed to generate legal draft",
      details: error.message,
    });
  }
});

// ✅ GET /api/ai/usage - returns remaining prompts for today
router.get("/usage", lightVerifyToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id || req.user._id;
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ error: "User not found" });

    const today = new Date().toDateString();
    if (user.lastPromptDate !== today) {
      // Reset if new day
      user.dailyPromptCount = 0;
      user.lastPromptDate = today;
      await user.save();
    }

    const remaining = Math.max(5 - user.dailyPromptCount, 0);

    return res.json({
      success: true,
      remaining,
      used: user.dailyPromptCount,
      date: today,
    });
  } catch (err) {
    console.error("❌ Usage Check Error:", err);
    res.status(500).json({ error: "Failed to fetch usage info" });
  }
});

module.exports = router;
