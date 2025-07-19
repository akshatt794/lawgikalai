const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post('/draft', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a helpful and professional Indian legal assistant who drafts formal legal documents. Avoid casual tone. Your replies must be structured and use legal language."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.6
    });

    const draft = response.choices[0].message.content;
    res.status(200).json({ draft });
  } catch (error) {
    console.error("AI Draft Error:", error);
    res.status(500).json({ error: "Failed to generate legal draft" });
  }
});

module.exports = router;
