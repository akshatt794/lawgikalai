const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Announcement = require('../models/Announcement');
const Case = require('../models/Case');
const News = require('../models/News');
const verifyToken = require('../middleware/verifyToken');

function pickImageURL(n) {
  // Robustly extract a usable URL string from various shapes/fields
  if (!n) return null;
  const fromObject =
    n.image?.secure_url ||
    n.image?.url ||
    (Array.isArray(n.image) ? n.image[0] : null) ||
    n.imageUrl ||
    n.thumbnailUrl ||
    n.thumbnail ||
    (Array.isArray(n.images) ? n.images[0] : null);
  return fromObject || null;
}

// GET /api/home - Homepage Data API
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const now = new Date();

    // Prepare both ObjectId and string match (covers schemas storing userId as ObjectId or string)
    const oid = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : null;
    const userMatch = {
      $or: [
        ...(oid ? [{ userId: oid }] : []),
        { $expr: { $eq: [{ $toString: '$userId' }, String(userId)] } }
      ]
    };

    // 1) Announcements
    const announcements = await Announcement.find().sort({ createdAt: -1 }).limit(10);

    // 2) Nearest upcoming case (unwind array, handle userId type differences)
    let nearestCaseDoc = await Case.aggregate([
      { $match: userMatch },
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

    // Fallback to most recent past hearing if no upcoming exists
    if (!nearestCaseDoc[0]) {
      nearestCaseDoc = await Case.aggregate([
        { $match: userMatch },
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

    // 3) Stats (use $or to support both userId types + array elemMatch)
    const total = await Case.countDocuments(userMatch);
    const upcoming = await Case.countDocuments({
      ...userMatch,
      hearing_details: { $elemMatch: { next_hearing_date: { $gte: now } } }
    });
    const closed = await Case.countDocuments({ ...userMatch, case_status: 'Closed' });

    // 4) News (return image as a URL string in same 'image' key)
    const rawNews = await News.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title content image imageUrl images thumbnail thumbnailUrl createdAt')
      .lean();

    const news = rawNews.map(n => ({
      ...n,
      image: pickImageURL(n) // ensure the 'image' field is a URL string
    }));

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
