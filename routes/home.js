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
  ''; // optional, but needed for presign / public base

const S3_PUBLIC_BASE =
  process.env.S3_PUBLIC_BASE || (BUCKET ? `https://${BUCKET}.s3.${REGION}.amazonaws.com` : '');

// set to "true" if your bucket is private and you want signed URLs from this API
const FORCE_SIGNED = String(process.env.S3_FORCE_SIGNED || '').toLowerCase() === 'true';

// We only import AWS SDK bits if we may need to presign.
let s3, getSignedUrl, GetObjectCommand;
if (FORCE_SIGNED && BUCKET) {
  const { S3Client, GetObjectCommand: _GetObjectCommand } = require('@aws-sdk/client-s3');
  ({ getSignedUrl } = require('@aws-sdk/s3-request-presigner'));
  GetObjectCommand = _GetObjectCommand;

  // Uses instance role / env creds automatically. No hardcoded keys here.
  s3 = new S3Client({ region: REGION });
}

const BASE_URL = process.env.BASE_URL || 'https://lawgikalai-auth-api.onrender.com';

// -------- helpers --------
function pickRawImage(n) {
  // find whatever field holds the image reference
  if (!n) return null;
  const url =
    n.image?.secure_url ||
    n.image?.url ||
    (typeof n.image === 'string' ? n.image : null) ||
    n.imageUrl ||
    n.fileUrl ||         // 👈 added
    n.thumbnailUrl ||
    n.thumbnail ||
    (Array.isArray(n.images) ? n.images[0] : null);
  return url || null;
}

function extractS3KeyFromUrl(u) {
  try {
    const parsed = new URL(u);
    // Virtual-hosted–style: https://<bucket>.s3.<region>.amazonaws.com/<key>
    if (BUCKET && parsed.hostname.startsWith(`${BUCKET}.s3`)) {
      return decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
    }
    // Path-style or custom domain can't be reliably parsed here—fallback returns null
    return null;
  } catch {
    return null;
  }
}

async function toAwsCompatibleUrl(raw) {
  if (!raw) return null;

  // local upload case
  if (raw.startsWith('/uploads')) return `${BASE_URL}${raw}`;

  // already a public http(s) URL
  if (/^https?:\/\//i.test(raw)) {
    // if forced signed and it's an S3 URL for our bucket, sign it
    if (FORCE_SIGNED && BUCKET) {
      const keyFromHttps = extractS3KeyFromUrl(raw);
      if (keyFromHttps) {
        const signed = await getSignedUrl(
          s3,
          new GetObjectCommand({ Bucket: BUCKET, Key: keyFromHttps }),
          { expiresIn: 3600 }
        );
        return signed;
      }
    }
    return raw;
  }

  // s3://bucket/key format
  if (raw.startsWith('s3://')) {
    try {
      const [, , rest] = raw.split('/');
      const [bucketCandidate, ...parts] = rest.split('/');
      const key = parts.join('/');
      if (!BUCKET || bucketCandidate !== BUCKET) return raw; // unknown bucket, leave as-is
      if (FORCE_SIGNED) {
        const signed = await getSignedUrl(
          s3,
          new GetObjectCommand({ Bucket: BUCKET, Key: key }),
          { expiresIn: 3600 }
        );
        return signed;
      }
      return `${S3_PUBLIC_BASE}/${key}`;
    } catch {
      return raw;
    }
  }

  // looks like a bare S3 key (e.g., "news/abc.jpg")
  if (BUCKET) {
    if (FORCE_SIGNED) {
      const signed = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: BUCKET, Key: raw }),
        { expiresIn: 3600 }
      );
      return signed;
    }
    if (S3_PUBLIC_BASE) return `${S3_PUBLIC_BASE}/${raw}`;
  }

  // fallback: return as-is
  return raw;
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

    // 2) Nearest upcoming case (safe convert date)
    let nearestCaseDoc = await Case.aggregate([
      { $match: userMatch },
      { $unwind: '$hearing_details' },
      {
        $addFields: {
          _hd_next: {
            $convert: {
              input: '$hearing_details.next_hearing_date',
              to: 'date',
              onError: null,
              onNull: null
            }
          }
        }
      },
      { $match: { _hd_next: { $ne: null, $gte: now } } },
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
              $convert: {
                input: '$hearing_details.next_hearing_date',
                to: 'date',
                onError: null,
                onNull: null
              }
            }
          }
        },
        { $match: { _hd_next: { $ne: null, $lte: now } } },
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

    const upcomingAgg = await Case.aggregate([
      { $match: userMatch },
      { $unwind: '$hearing_details' },
      {
        $addFields: {
          _hd_next: {
            $convert: {
              input: '$hearing_details.next_hearing_date',
              to: 'date',
              onError: null,
              onNull: null
            }
          }
        }
      },
      { $match: { _hd_next: { $ne: null, $gte: now } } },
      { $group: { _id: '$_id' } },
      { $count: 'count' }
    ]);
    const upcoming = upcomingAgg[0]?.count || 0;

    const closed = await Case.countDocuments({ ...userMatch, case_status: 'Closed' });

    // 4) News (normalize image to URL string; AWS-compatible)
    const rawNews = await News.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title content image imageUrl fileUrl images thumbnail thumbnailUrl createdAt') // include all possible fields
      // +image in case select:false
      .lean();

    // Resolve each image into a usable URL (public or presigned)
    const news = await Promise.all(
      rawNews.map(async n => {
        const rawImg = pickRawImage(n);
        const image = await toAwsCompatibleUrl(rawImg);
        return { ...n, image };
      })
    );

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
