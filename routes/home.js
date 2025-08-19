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

// Robust: supports many shapes and field names, and can extract from rich content.
function pickRawImage(n) {
  if (!n) return null;

  const resolveObj = (obj) =>
    obj?.secure_url ||
    obj?.url ||
    obj?.Location ||   // AWS SDK upload resp
    obj?.path ||
    obj?.fileUrl ||
    obj?.imageUrl ||
    obj?.src ||
    obj?.href ||
    obj?.key ||
    null;

  // 1) Common single fields (string or object)
  const singleFields = [
    'image',
    'imageUrl',
    'fileUrl',
    'cover',
    'coverImage',
    'cover_image',
    'banner',
    'featuredImage',
    'heroImage',
    'thumbnail',
    'thumbnailUrl',
    'thumb',
    'url'
  ];
  for (const f of singleFields) {
    const v = n[f];
    if (!v) continue;
    if (typeof v === 'string') return v;
    if (typeof v === 'object') {
      const r = resolveObj(v);
      if (r) return r;
    }
  }

  // 2) Array fields
  const arrayFields = ['images', 'media', 'attachments', 'files', 'assets', 'photos', 'gallery'];
  for (const f of arrayFields) {
    const arr = n[f];
    if (!Array.isArray(arr) || !arr.length) continue;

    // Prefer explicit image-like entries
    for (const it of arr) {
      if (typeof it === 'string') {
        if (/\.(png|jpe?g|webp|gif|svg)(\?|#|$)/i.test(it)) return it;
      } else if (it && typeof it === 'object') {
        if (
          (it.mimetype && it.mimetype.startsWith('image/')) ||
          (it.type && String(it.type).startsWith('image/')) ||
          (it.contentType && String(it.contentType).startsWith('image/'))
        ) {
          const r = resolveObj(it);
          if (r) return r;
        }
      }
    }

    // Otherwise, first resolvable
    const first = arr[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object') {
      const r = resolveObj(first);
      if (r) return r;
    }
  }

  // 3) Extract first image URL from rich content
  if (typeof n.content === 'string') {
    const m = n.content.match(/https?:\/\/[^\s)"'<]+?\.(?:png|jpe?g|webp|gif|svg)(?:[?#][^\s)"'<]*)?/i);
    if (m) return m[0];
  }

  return null;
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

  // Local uploads
  if (raw.startsWith('/uploads')) return `${BASE_URL}${raw}`;

  // Absolute HTTPS
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

  // Bare S3 key (may include query string)
  if (BUCKET) {
    const bareKey = raw.replace(/^\//, '');
    const [keyOnly] = bareKey.split('?'); // strip query for signing
    if (FORCE_SIGNED) {
      return await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: BUCKET, Key: keyOnly }),
        { expiresIn: 3600 }
      );
    }
    if (S3_PUBLIC_BASE) return `${S3_PUBLIC_BASE}/${bareKey}`;
  }

  // Fallback
  return raw;
}

/**
 * DocDB-safe date coercion:
 * - date -> as-is
 * - ISO-looking string -> $dateFromString
 * - else -> null
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
                  { $regexMatch: { input: '$$raw', regex: /^\d{4}-\d{2}-\d{2}/ } }
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

    // Remove .select so picker can see every field shape
    const rawNewsPromise = News.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const totalPromise = Case.countDocuments(userMatch);
    const closedPromise = Case.countDocuments({
      ...userMatch,
      case_status: { $regex: /^closed$/i }
    });

    // Upcoming count (distinct cases having a future hearing)
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

    // Nearest upcoming case; fallback to most recent past
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
