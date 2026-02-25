const express = require("express");
const Post = require("../models/Post");
const multer = require("multer");
const { verifyToken } = require("../middleware/verifyToken");
const { uploadToS3, getPresignedUrl, s3 } = require("../utils/s3Client");
const {
  createPostLimiter,
  commentLimiter,
  likeLimiter,
} = require("../middleware/feedRateLimiter");
const { lightVerifyToken } = require("../middleware/lightVerifyToken");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
  fileFilter: (req, file, cb) => {
    const isImage = file.mimetype.startsWith("image/");
    const isVideo = file.mimetype.startsWith("video/");

    if (!isImage && !isVideo) {
      return cb(new Error("Only images or videos allowed"));
    }

    cb(null, true);
  },
}); // store in memory buffer

// ------------------------------------
// Helper: Delete image from S3
// ------------------------------------
const deleteFromS3 = async (key) => {
  if (!key) return;

  await s3
    .deleteObject({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    })
    .promise();
};

// ====================================
//  CREATE POST
// ====================================
router.post(
  "/",
  verifyToken,
  createPostLimiter,
  upload.fields([
    { name: "images", maxCount: 5 },
    { name: "video", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { content } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: "Content is required" });
      }

      if (content.trim().length > 500) {
        return res.status(400).json({ error: "Content too long" });
      }

      const images = req.files?.images || [];
      const videos = req.files?.video || [];

      // ❌ Cannot upload both images and video
      if (images.length > 0 && videos.length > 0) {
        return res.status(400).json({
          error: "You can upload either images or one video, not both.",
        });
      }

      let imageKeys = [];
      let videoKey = null;

      // =========================
      // HANDLE IMAGES
      // =========================
      if (images.length > 0) {
        for (const file of images) {
          const key = await uploadToS3(file, "posts/images");
          imageKeys.push(key);
        }
      }

      // =========================
      // HANDLE VIDEO
      // =========================
      if (videos.length > 0) {
        const videoFile = videos[0];

        // Basic mimetype validation
        if (!videoFile.mimetype.startsWith("video/")) {
          return res.status(400).json({ error: "Invalid video format" });
        }

        // Optional: Restrict to mp4 only
        if (videoFile.mimetype !== "video/mp4") {
          return res.status(400).json({
            error: "Only MP4 videos are allowed",
          });
        }

        videoKey = await uploadToS3(videoFile, "posts/videos");
      }

      const post = new Post({
        author: req.user.userId,
        content: content.trim(),
        image_urls: imageKeys,
        video_url: videoKey,
      });

      await post.save();

      res.status(201).json({
        ok: true,
        message: "Post created successfully",
        post,
      });
    } catch (err) {
      console.error("❌ Create Post Error:", err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

// ====================================
//  GET FEED (Infinite Scroll)
// ====================================
router.get("/", async (req, res) => {
  try {
    const { cursor } = req.query;

    let query = {};

    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    const posts = await Post.find(query)
      .populate("author", "fullName practiceArea")
      .populate("comments.user", "fullName") // ✅ populate comment authors
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const postsWithMedia = await Promise.all(
      posts.map(async (p) => {
        let images = [];
        let video = null;

        if (p.image_urls && p.image_urls.length > 0) {
          images = await Promise.all(
            p.image_urls.map((key) => getPresignedUrl(key)),
          );
        }

        if (p.video_url) {
          video = await getPresignedUrl(p.video_url);
        }

        return { ...p, images, video };
      }),
    );

    res.json({
      ok: true,
      posts: postsWithMedia,
      nextCursor: posts.length > 0 ? posts[posts.length - 1].createdAt : null,
    });
  } catch (err) {
    console.error("❌ Fetch Feed Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/mine", lightVerifyToken, async (req, res) => {
  try {
    const posts = await Post.find({ author: req.user.userId })
      .populate("author", "fullName practiceArea")
      .populate("comments.user", "fullName")
      .sort({ createdAt: -1 })
      .lean();

    const postsWithMedia = await Promise.all(
      posts.map(async (p) => {
        let images = [];
        let video = null;

        if (p.image_urls && p.image_urls.length > 0) {
          images = await Promise.all(
            p.image_urls.map((key) => getPresignedUrl(key)),
          );
        }

        if (p.video_url) {
          video = await getPresignedUrl(p.video_url);
        }

        return { ...p, images, video };
      }),
    );

    res.json({ ok: true, posts: postsWithMedia });
  } catch (err) {
    console.error("❌ Fetch My Posts Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ====================================
//  GET LIKED POSTS
// ====================================
router.get("/liked/me", lightVerifyToken, async (req, res) => {
  try {
    const posts = await Post.find({
      likes: req.user.userId,
    })
      .populate("author", "fullName practiceArea")
      .populate("comments.user", "fullName") // ✅ populate comment authors
      .sort({ createdAt: -1 })
      .lean();

    const postsWithMedia = await Promise.all(
      posts.map(async (p) => {
        let images = [];
        let video = null;

        if (p.image_urls && p.image_urls.length > 0) {
          images = await Promise.all(
            p.image_urls.map((key) => getPresignedUrl(key)),
          );
        }

        if (p.video_url) {
          video = await getPresignedUrl(p.video_url);
        }

        return { ...p, images, video };
      }),
    );

    res.json({ ok: true, posts: postsWithMedia });
  } catch (err) {
    console.error("❌ Fetch Liked Posts Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ====================================
// DELETE POST (Author Only)
// ====================================
router.delete("/:postId", lightVerifyToken, async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Only author can delete
    if (post.author.toString() !== req.user.userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Delete images from S3
    if (post.image_urls && post.image_urls.length > 0) {
      for (const key of post.image_urls) {
        try {
          await deleteFromS3(key);
        } catch (err) {
          console.warn("⚠️ Failed to delete image:", err.message);
        }
      }
    }

    // Delete video
    if (post.video_url) {
      try {
        await deleteFromS3(post.video_url);
      } catch (err) {
        console.warn("⚠️ Failed to delete video:", err.message);
      }
    }

    await Post.findByIdAndDelete(postId);

    res.json({
      ok: true,
      message: "Post deleted successfully",
    });
  } catch (err) {
    console.error("❌ Delete Post Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ====================================
// LIKE / UNLIKE POST
// ====================================
router.put("/:postId/like", lightVerifyToken, likeLimiter, async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId).populate(
      "author",
      "fullName practiceArea",
    );

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const userId = req.user.userId;

    const alreadyLiked = post.likes.some((id) => id.toString() === userId);

    if (alreadyLiked) {
      post.likes.pull(userId);
      post.likeCount = Math.max(0, post.likeCount - 1);
    } else {
      post.likes.push(userId);
      post.likeCount += 1;
    }

    await post.save();

    res.json({
      ok: true,
      liked: !alreadyLiked,
      likeCount: post.likeCount,
    });
  } catch (err) {
    console.error("❌ Like Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ====================================
// ADD COMMENT
// ====================================
router.post(
  "/:postId/comment",
  lightVerifyToken,
  commentLimiter,
  async (req, res) => {
    try {
      const { text } = req.body;
      const { postId } = req.params;

      if (!text || text.trim().length === 0) {
        return res.status(400).json({ error: "Comment is required" });
      }

      const post = await Post.findById(postId);

      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }

      post.comments.push({
        user: req.user.userId,
        text: text.trim(),
      });

      post.commentCount += 1;

      await post.save();

      // ✅ Get the newly added comment (last one) and populate its user
      const newComment = post.comments[post.comments.length - 1];
      await post.populate({
        path: "comments.user",
        select: "fullName",
        match: { _id: newComment.user },
      });

      // ✅ Find the populated version of the new comment
      const populatedComment = post.comments.find(
        (c) => c._id.toString() === newComment._id.toString(),
      );

      res.json({
        ok: true,
        commentCount: post.commentCount,
        comment: populatedComment, // ✅ return full comment with populated user
      });
    } catch (err) {
      console.error("❌ Comment Error:", err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

module.exports = router;
