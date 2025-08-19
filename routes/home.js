// routes/home.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Announcement = require('../models/Announcement');
const Case = require('../models/Case');
const News = require('../models/News');
const verifyToken = require('../middleware/verifyToken');

// ===== AWS (optional presign) =====
const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'ap-south-1';
const BUCKET =
  process.env.S3_BUCKET_NAME ||
  process.env.AWS_S3_BUCKET ||
  process.env.AWS_BUCKET_NAME ||
  '';

const S3_PUBLIC_BASE =
  process.env.S3_PUBLIC_BASE || (BUCKET ? `https://${BUCKET}.s3.${REGION}.amazonaws.com` : '');

const FORCE_SIGNED = String(process.env.S3_FORCE_SIGNED || '').toLowerCase() === 'true';

let s3, getSignedUrl, GetObjectCommand;
if (FORCE_SIGNED && BUCKET) {
  const { S3Client, GetObjectCommand: _GetObjectCommand } = require('@aws-sdk/client-s3');
  ({ getSignedUrl } = require('@aws-sdk/s3-request-presigner'));
  GetObjectCommand = _GetObjectCommand;
  s3 = new S3Client({ region: REGION });
}

const BASE_URL = process.env.BASE_URL || 'https://lawgikalai-auth-api.onrender.com';

// -------- helpers --------
function pickRawImage(n) {
  if (!n) return null;

  if (Array.isArray(n.images) && n.images.length) {
    const first = n.images[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object') return first.secure_url || first.url || first.path || null;
  }

  return (
    n.image?.secure_url ||
    n.image?.url ||
    (typeof n.image === 'string' ? n.image : null) ||
    n.imageUrl ||
    n.fileUrl ||
    n.thumbnailUrl ||
    n.thumbnail ||
    null
  );
}

function extractS3KeyFromUrl(u) {
  try {
    const parsed = new URL(u);
    if (BUCKET && parsed.hostname.startsWith(`${BUCKET}.s3`)) {
      return decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
    }
    return null;
  } catch {
    return null;
  }
}

async function toAwsCompatibleUrl(raw) {
  if (!raw) return null;

  if (raw.startsWith('/uploads')) return `${BASE_URL}${raw}`;

  if (/^https?:\/\//i.test(raw)) {
    if (FORCE_SIGNED && BUCKET) {
      const keyFromHttps = extractS3KeyFromUrl(raw);
      if (keyFromHttps) {
        return await getSignedUrl(
          s3,
          new GetObjectCommand({ Bucket: BUCKET, Key: keyFromHttps }),
          { expiresIn: 3600 }
        );
      }
    }
    return raw;
  }

  if (raw.startsWith('s3://')) {
    try {
      const [, , rest] = raw.split('/');
      const [bucketCandidate, ...parts] = rest.split('/');
      const key = parts.join('/');
      if (!BUCKET || bucketCandidate !== BUCKET) return raw;
      if (FORCE_SIGNED) {
        return await getSignedUrl(
          s3,
          new GetObjectCommand({ Bucket: BUCKET, Key: key }),
          { expiresIn: 3600 }
        );
      }
      return `${S3_PUBLIC_BASE}/${key}`;
    } catch {
      return raw;
    }
  }

  if (BUCKET) {
    if (FORCE_SIGNED) {
      return await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: BUCKET, Key: raw }),
        { expiresIn: 3600 }
      );
    }
    if (S3_PUBLIC_BASE) return `${S3_PUBLIC_BASE}/${raw}`;
  }

  return raw;
}

/**
 * DocDB-safe date coercion:
 * - If value is already a Date -> use it
 * - If it's a string that *looks* ISO (YYYY-MM-DD...) -> parse with $dateFromString
 * - Else -> null
 * NOTE: DocDB does NOT support onError/onNull in $dateFromString.
 */
function safeDateExpr(jsonPath) {
  return {
    $let: {
      vars: { raw: jsonPath },
      in: {
        $cond: [
          { $eq: [{ $type: '$$raw' }, 'date'] },
          '$$raw',
          {
            $cond: [
              {
                $and: [
                  { $eq: [{ $type: '$$raw' }, 'string'] },
                  { $regexMatch: { input: '$$raw', regex: /^\d{4}-\d{2}-\d{2}/ } } // ISO-like
                ]
              },
              { $dateFromString: { dateString: '$$raw' } },
              null
            ]
          }
        ]
      }
    }
  };
}

// ========== GET /api/home ==========
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = String(req.user.userId || '');
    const now = new Date();

    // Match userId stored as ObjectId OR string
    const oid = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : null;

    const userMatch = {
      $or: [
        ...(oid ? [{ userId: oid }] : []),
        { userId } // exact string
      ]
    };

    // Parallel fetches
    const announcementsPromise = Announcement.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const rawNewsPromise = News.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .select(
        'title content image imageUrl fileUrl images thumbnail thumbnailUrl createdAt category source'
      )
      .lean();

    const totalPromise = Case.countDocuments(userMatch);
    const closedPromise = Case.countDocuments({
      ...userMatch,
      case_status: { $regex: /^closed$/i }
    });

    // Upcoming count (distinct cases having a future hearing) — DocDB-safe
    const upcomingAggPromise = Case.aggregate([
      { $match: userMatch },
      { $unwind: '$hearing_details' },
      { $addFields: { _hd_next: safeDateExpr('$hearing_details.next_hearing_date') } },
      { $match: { _hd_next: { $ne: null, $gte: now } } },
      { $group: { _id: '$_id' } },
      { $count: 'count' }
    ]);

    const [announcements, rawNews, total, closed, upcomingAgg] = await Promise.all([
      announcementsPromise,
      rawNewsPromise,
      totalPromise,
      closedPromise,
      upcomingAggPromise
    ]);

    const upcoming = upcomingAgg?.[0]?.count || 0;

    // Nearest upcoming case; fallback to most recent past — DocDB-safe
    let nearestCaseDoc = await Case.aggregate([
      { $match: userMatch },
      { $unwind: '$hearing_details' },
      { $addFields: { _hd_next: safeDateExpr('$hearing_details.next_hearing_date') } },
      { $match: { _hd_next: { $ne: null, $gte: now } } },
      { $sort: { _hd_next: 1 } },
      {
        $project: {
          _id: 1,
          case_title: 1,
          court_name: 1,
          'hearing_details.time': 1,
          'hearing_details.next_hearing_date': '$_hd_next'
        }
      },
      { $limit: 1 }
    ]);

    if (!nearestCaseDoc[0]) {
      nearestCaseDoc = await Case.aggregate([
        { $match: userMatch },
        { $unwind: '$hearing_details' },
        { $addFields: { _hd_next: safeDateExpr('$hearing_details.next_hearing_date') } },
        { $match: { _hd_next: { $ne: null, $lte: now } } },
        { $sort: { _hd_next: -1 } },
        {
          $project: {
            _id: 1,
            case_title: 1,
            court_name: 1,
            'hearing_details.time': 1,
            'hearing_details.next_hearing_date': '$_hd_next'
          }
        },
        { $limit: 1 }
      ]);
    }

    const nearest_case = nearestCaseDoc[0] || null;

    // Normalize news images (presign only if needed)
    const news = await Promise.all(
      (rawNews || []).map(async (n) => {
        const rawImg = pickRawImage(n);
        const image = await toAwsCompatibleUrl(rawImg);
        return { ...n, image };
      })
    );

    return res.json({
      message: 'Home data fetched',
      announcements,
      nearest_case,
      stats: { total, upcoming, closed },
      news
    });
  } catch (err) {
    console.error('❌ Home route error:', err);
    return res.status(500).json({ error: 'Server error', details: err.message });
  }
});

module.exports = router;
