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

    // 1. Get last 10 announcements
    const announcements = await Announcement.find()
      .sort({ createdAt: -1 })
      .limit(10);

    // 2. Get nearest upcoming case for the user
    const nearestCase = await Case.findOne({
      userId,
      'hearing_details.next_hearing_date': { $gte: new Date() }
    })
      .sort({ 'hearing_details.next_hearing_date': 1 })
      .select('case_title hearing_details.next_hearing_date hearing_details.time court_name _id');

    // 3. Case stats
    const total = await Case.countDocuments({ userId });
    const upcoming = await Case.countDocuments({
      userId,
      'hearing_details.next_hearing_date': { $gte: new Date() }
    });
    const closed = await Case.countDocuments({ userId, case_status: 'Closed' });

    // 4. Get latest top 10 news
    const news = await News.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title content image createdAt');

    res.json({
      message: "Home data fetched",
      announcements,
      nearest_case: nearestCase,
      stats: {
        total,
        upcoming,
        closed
      },
      news
    });

  } catch (err) {
    console.error('❌ Home route error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

module.exports = router;
