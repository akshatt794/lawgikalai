const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const Case = require('../models/Case');
const News = require('../models/News');
const verifyToken = require('../middleware/verifyToken');

// GET /api/home - Homepage Data API
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const now = new Date();

    // 1. Get last 10 announcements
    const announcements = await Announcement.find()
      .sort({ createdAt: -1 })
      .limit(10);

    // 2. Get nearest upcoming case for the user
    //    (handles when hearing_details is an array)
    let nearestCaseDoc = await Case.aggregate([
      { $match: { userId } },
      { $unwind: '$hearing_details' },
      { $match: { 'hearing_details.next_hearing_date': { $gte: now } } },
      { $sort: { 'hearing_details.next_hearing_date': 1 } },
      {
        $project: {
          _id: 1,
          case_title: 1,
          'hearing_details.next_hearing_date': 1,
          'hearing_details.time': 1,
          court_name: 1
        }
      },
      { $limit: 1 }
    ]);

    // Fallback: if no upcoming, pick the most recent past hearing
    if (!nearestCaseDoc[0]) {
      nearestCaseDoc = await Case.aggregate([
        { $match: { userId } },
        { $unwind: '$hearing_details' },
        { $match: { 'hearing_details.next_hearing_date': { $lte: now } } },
        { $sort: { 'hearing_details.next_hearing_date': -1 } },
        {
          $project: {
            _id: 1,
            case_title: 1,
            'hearing_details.next_hearing_date': 1,
            'hearing_details.time': 1,
            court_name: 1
          }
        },
        { $limit: 1 }
      ]);
    }
    const nearestCase = nearestCaseDoc[0] || null;

    // 3. Case stats
    const total = await Case.countDocuments({ userId });
    const upcoming = await Case.countDocuments({
      userId,
      hearing_details: { $elemMatch: { next_hearing_date: { $gte: now } } }
    });
    const closed = await Case.countDocuments({ userId, case_status: 'Closed' });

    // 4. Get latest top 10 news (ensure image is a URL string in the same 'image' field)
    const rawNews = await News.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title content image imageUrl createdAt');

    const news = rawNews.map(doc => {
      const n = doc.toObject();
      // prefer nested url -> imageUrl field -> plain image (unchanged)
      const img =
        (n.image && n.image.url) ||
        n.imageUrl ||
        n.image;
      return { ...n, image: img };
    });

    res.json({
      message: 'Home data fetched',
      announcements,
      nearest_case: nearestCase,
      stats: { total, upcoming, closed },
      news
    });
  } catch (err) {
    console.error('❌ Home route error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

module.exports = router;
