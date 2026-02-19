const rateLimit = require("express-rate-limit");

// 🔥 Limit post creation
const createPostLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: {
    error: "Post limit exceeded. You can create max 5 posts per hour.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 🔥 Limit comments
const commentLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  message: {
    error: "Too many comments. Please slow down.",
  },
});

// 🔥 Limit likes
const likeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: {
    error: "Too many actions. Please slow down.",
  },
});

module.exports = {
  createPostLimiter,
  commentLimiter,
  likeLimiter,
};
