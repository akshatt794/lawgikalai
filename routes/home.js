const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Announcement = require('../models/Announcement');
const Case = require('../models/Case');
const News = require('../models/News');
const verifyToken = require('../middleware/verifyToken');

const BASE_URL = process.env.BASE_URL || 'https://lawgikalai-auth-api.onrender.com';

function pickImageURL(n) {
  if (!n) return null;
  const url =
    n.image?.secure_url ||
    n.image?.url ||
    (typeof n.image === 'string' ? n.image : null) ||
    n.imageUrl ||
    n.thumbnailUrl ||
    n.thumbnail ||
    (Array.isArray(n.images) ? n.images[0] : null);

  if (typeof url === 'string' && url.startsWith('/uploads')) {
    return `${BASE_URL}${url}`;
  }
  return url || null;
}

// GET /api/home - Homepage Data API
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const now = new Date();

    // Match userId as ObjectId or string
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
    const announcements = await Announcement.find()
      .sort({ createdAt: -1 })
      .limit(10);

    // 2) Nearest upcoming case (convert string dates to Date before compare)
    let nearestCaseDoc = await Case.aggregate([
      { $match: userMatch },
      { $unwind: '$hearing_details' },
      {
        $addFields: {
          _hd_next: {
            $cond: [
              { $gte: [{ $type: '$hearing_details.next_hearing_date' }, 'string'] },
              { $toDate: '$hearing_details.next_hearing_date' },
              '$hearing_details.next_hearing_date'
            ]
          }
        }
      },
      { $match: { _hd_next: { $gte: now } } },
      { $sort: { _hd_next: 1 } },
      {
        $project: {
          _id: 1,
          case_title: 1,
          'hearing_details.next_hearing_date': '$_hd_next',
          'hearing_details.time': 1,
          court_name: 1
        }
      },
      { $limit: 1 }
    ]);

    // Fallback: most recent past hearing
    if (!nearestCaseDoc[0]) {
      nearestCaseDoc = await Case.aggregate([
        { $match: userMatch },
        { $unwind: '$hearing_details' },
        {
          $addFields: {
            _hd_next: {
              $cond: [
                { $gte: [{ $type: '$hearing_details.next_hearing_date' }, 'string'] },
                { $toDate: '$hearing_details.next_hearing_date' },
                '$hearing_details.next_hearing_date'
              ]
            }
          }
        },
        { $match: { _hd_next: { $lte: now } } },
        { $sort: { _hd_next: -1 } },
        {
          $project: {
            _id: 1,
            case_title: 1,
            'hearing_details.next_hearing_date': '$_hd_next',
            'hearing_details.time': 1,
            court_name: 1
          }
        },
        { $limit: 1 }
      ]);
    }
    const nearestCase = nearestCaseDoc[0] || null;

    // 3) Stats
    const total = await Case.countDocuments(userMatch);

    // upcoming count with date conversion
    const upcomingAgg = await Case.aggregate([
      { $match: userMatch },
      { $unwind: '$hearing_details' },
      {
        $addFields: {
          _hd_next: {
            $cond: [
              { $gte: [{ $type: '$hearing_details.next_hearing_date' }, 'string'] },
              { $toDate: '$hearing_details.next_hearing_date' },
              '$hearing_details.next_hearing_date'
            ]
          }
        }
      },
      { $match: { _hd_next: { $gte: now } } },
      { $group: { _id: '$_id' } }, // distinct cases with upcoming hearing
      { $count: 'count' }
    ]);
    const upcoming = upcomingAgg[0]?.count || 0;

    const closed = await Case.countDocuments({ ...userMatch, case_status: 'Closed' });

    // 4) News (normalize image to URL string)
    const rawNews = await News.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title content image imageUrl createdAt')
      .lean();

    const news = rawNews.map(n => ({
      ...n,
      image: pickImageURL(n)
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
