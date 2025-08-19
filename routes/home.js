// routes/home.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Announcement = require('../models/Announcement');
const Case = require('../models/Case');
const News = require('../models/News');
const verifyToken = require('../middleware/verifyToken');

// ===== AWS presign (optional) =====
const REGION =
  process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'ap-south-1';

const BUCKET =
  process.env.S3_BUCKET_NAME ||
  process.env.AWS_S3_BUCKET ||
  process.env.AWS_BUCKET_NAME ||
  ''; // optional unless you need presign or a public base

const S3_PUBLIC_BASE =
  process.env.S3_PUBLIC_BASE ||
  (BUCKET ? `https://${BUCKET}.s3.${REGION}.amazonaws.com` : '');

const FORCE_SIGNED =
  String(process.env.S3_FORCE_SIGNED || '').toLowerCase() === 'true';

// Lazy-import AWS SDK pieces only if needed
let s3, getSignedUrl, GetObjectCommand;
if (FORCE_SIGNED && BUCKET) {
  const { S3Client, GetObjectCommand: _GetObjectCommand } = require('@aws-sdk/client-s3');
  ({ getSignedUrl } = require('@aws-sdk/s3-request-presigner'));
  GetObjectCommand = _GetObjectCommand;
  s3 = new S3Client({ region: REGION }); // uses env/instance creds automatically
}

const BASE_URL = process.env.BASE_URL || 'https://lawgikalai-auth-api.onrender.com';

/** Pick the raw image reference from a News doc (handles many shapes). */
function pickRawImage(n) {
  if (!n) return null;

  // arrays of strings or objects
  if (Array.isArray(n.images) && n.images.length) {
    const first = n.images[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object') {
      return first.secure_url || first.url || first.path || null;
    }
  }

  // common single fields
  const url =
    n.image?.secure_url ||
    n.image?.url ||
    (typeof n.image === 'string' ? n.image : null) ||
    n.imageUrl ||
    n.fileUrl || // sometimes you store fileUrl for S3
    n.thumbnailUrl ||
    n.thumbnail;

  return url || null;
}

/** When given a public S3 URL for our bucket, return the object key. */
function extractS3KeyFromUrl(u) {
  try {
    const parsed = new URL(u);
    // https://<bucket>.s3.<region>.amazonaws.com/<key>
    if (BUCKET && parsed.hostname.startsWith(`${BUCKET}.s3`)) {
      return decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
    }
    return null; // unknown format or different bucket
  } catch {
    return null;
  }
}

/** Normalize any image reference to a usable URL (local/https/S3 key/s3:// form). */
async function toAwsCompatibleUrl(raw) {
  if (!raw) return null;

  // Local uploads from your server
  if (raw.startsWith('/uploads')) return `${BASE_URL}${raw}`;

  // Already an absolute http(s) URL (Cloudinary, public S3, etc.)
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

  // s3://bucket/key
  if (raw.startsWith('s3://')) {
    try {
      const [, , rest] = raw.split('/');
      const [bucketCandidate, ...parts] = rest.split('/');
      const key = parts.join('/');
      if (!BUCKET || bucketCandidate !== BUCKET) return raw; // other bucket, leave as-is
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

  // Treat as bare S3 key (e.g., "news/abc.jpg")
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

  // Fallback as-is
  return raw;
}

/** Robustly coerce next_hearing_date (string or date) to Date during aggregation. */
function dateCoercionExpression(path) {
  // $type guard -> if date, use as is; if string, parse; else null
  return {
    $let: {
      vars: { raw: path },
      in: {
        $cond: [
          { $eq: [{ $type: '$$raw' }, 'date'] },
          '$$raw',
          {
            $cond: [
              { $eq: [{ $type: '$$raw' }, 'string'] },
              { $dateFromString: { dateString: '$$raw', onError: null, onNull: null } },
              null
            ]
          }
        ]
      }
    }
  };
}

// GET /api/home
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
        { userId } // exact string match
      ]
    };

    // Fetch announcements, news, and basic stats concurrently
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

    // Upcoming count via aggregation (distinct cases having a future hearing)
    const upcomingAggPromise = Case.aggregate([
      { $match: userMatch },
      { $unwind: '$hearing_details' },
      {
        $addFields: {
          _hd_next: dateCoercionExpression('$hearing_details.next_hearing_date')
        }
      },
      { $match: { _hd_next: { $ne: null, $gte: now } } },
      { $group: { _id: '$_id' } },
      { $count: 'count' }
    ]);

    // Await concurrent parts
    const [announcements, rawNews, total, closed, upcomingAgg] = await Promise.all([
      announcementsPromise,
      rawNewsPromise,
      totalPromise,
      closedPromise,
      upcomingAggPromise
    ]);

    const upcoming = upcomingAgg?.[0]?.count || 0;

    // Find nearest upcoming case for this user; fallback to most recent past
    let nearestCaseDoc = await Case.aggregate([
      { $match: userMatch },
      { $unwind: '$hearing_details' },
      {
        $addFields: {
          _hd_next: dateCoercionExpression('$hearing_details.next_hearing_date')
        }
      },
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
        {
          $addFields: {
            _hd_next: dateCoercionExpression('$hearing_details.next_hearing_date')
          }
        },
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
