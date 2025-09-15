// routes/home.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Announcement = require('../models/Announcement');
const Case = require('../models/Case');
const News = require('../models/News');
const { verifyToken } = require('../middleware/verifyToken');

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
    const bareKey = raw.replace(/^\//, '');
    if (FORCE_SIGNED) {
      return await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: BUCKET, Key: bareKey }),
        { expiresIn: 3600 }
      );
    }
    if (S3_PUBLIC_BASE) return `${S3_PUBLIC_BASE}/${bareKey}`;
  }

  return raw;
}

// DocDB-safe date coercion
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

    const oid = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : null;

    const userMatch = {
      $or: [
        ...(oid ? [{ userId: oid }] : []),
        { userId }
      ]
    };

    const announcementsPromise = Announcement.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const rawNewsPromise = News.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const totalPromise = Case.countDocuments(userMatch);
    const closedPromise = Case.countDocuments({
      ...userMatch,
      case_status: { $regex: /^closed$/i }
    });

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

    // nearest case
    let nearestCaseDoc = await Case.aggregate([
      { $match: userMatch },
      { $unwind: '$hearing_details' },
      { $addFields: { _hd_next: safeDateExpr('$hearing_details.next_hearing_date') } },
      { $match: { _hd_next: { $ne: null, $gte: now } } },
      { $sort: { _hd_next: 1 } },
      { $project: { _id: 1, case_title: 1, court_name: 1, 'hearing_details.time': 1, 'hearing_details.next_hearing_date': '$_hd_next' } },
      { $limit: 1 }
    ]);
    if (!nearestCaseDoc[0]) {
      nearestCaseDoc = await Case.aggregate([
        { $match: userMatch },
        { $unwind: '$hearing_details' },
        { $addFields: { _hd_next: safeDateExpr('$hearing_details.next_hearing_date') } },
        { $match: { _hd_next: { $ne: null, $lte: now } } },
        { $sort: { _hd_next: -1 } },
        { $project: { _id: 1, case_title: 1, court_name: 1, 'hearing_details.time': 1, 'hearing_details.next_hearing_date': '$_hd_next' } },
        { $limit: 1 }
      ]);
    }
    const nearest_case = nearestCaseDoc[0] || null;

    // Normalize news and pick only required fields
    const news = await Promise.all(
      (rawNews || []).map(async (n) => {
        const rawImg = pickRawImage(n);
        const image = await toAwsCompatibleUrl(rawImg);
        return {
          title: n.title,
          category: n.category,
          source: n.source,
          createdAt: n.createdAt,
          image
        };
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


router.get("/policies/:type", (req, res) => {
  const { type } = req.params; // comes as string

  const policies = {
    0: {
      title: "Terms and Conditions",
      content: `Welcome to LawgicalAi. By accessing or using our application, you agree to the following Terms and Conditions:

1. **Use of Service**  
   LawgicalAi is designed to help legal professionals manage and organize client case data. You agree to use the platform only for lawful purposes and in compliance with all applicable laws and regulations.

2. **User Responsibilities**  
   - You are solely responsible for the accuracy, completeness, and legality of the information you upload.  
   - You must ensure that you have obtained all necessary consents from your clients before storing or processing their information.  
   - You agree not to use the app to upload unlawful, harmful, or unauthorized content.  

3. **Data Ownership and Confidentiality**  
   - All data you input remains your property.  
   - LawgicalAi will not access, disclose, or share your case data except as required by law or with your consent.  
   - You are responsible for maintaining appropriate confidentiality with respect to your clients.  

4. **Disclaimer**  
   LawgicalAi does not provide legal advice. The app is a productivity tool and should not be considered a substitute for professional judgment or legal counsel.  

5. **Account and Security**  
   - You are responsible for safeguarding your account credentials.  
   - LawgicalAi is not liable for unauthorized access resulting from your failure to secure your account.  

6. **Limitation of Liability**  
   To the maximum extent permitted by law, LawgicalAi and its operators are not liable for any damages, losses, or consequences arising from the use of the platform, including but not limited to data loss or unauthorized access.  

7. **Termination**  
   We reserve the right to suspend or terminate accounts that violate these Terms.  

8. **Changes to Terms**  
   LawgicalAi may update these Terms from time to time. Continued use of the app after such updates constitutes acceptance of the revised Terms.  

If you do not agree with these Terms, please discontinue using the application immediately.
  `
    },
    1: {
      title: "Privacy Policy",
      content: `
At LawgicalAi, we respect your privacy and are committed to protecting the confidentiality of your information. This Privacy Policy explains how we collect, use, and safeguard your data.

1. **Information We Collect**  
   - **Account Information**: Name, email address, and login credentials.  
   - **Case Data**: Information you voluntarily upload regarding client cases.  
   - **Technical Data**: Device information, IP address, and usage logs for security and performance.  

2. **How We Use Your Information**  
   - To provide and improve our services.  
   - To ensure security, authentication, and account management.  
   - To comply with legal obligations when required.  
   - We do **not** sell, rent, or share your personal or case data with third parties for marketing purposes.  

3. **Data Confidentiality**  
   - All case data remains your property.  
   - We treat uploaded case data as strictly confidential and will not access or disclose it except:  
     (a) with your consent, or  
     (b) when legally required.  

4. **Data Security**  
   - We use industry-standard encryption and security measures to protect your data.  
   - However, no system is completely secure, and we cannot guarantee absolute security.  

5. **Third-Party Services**  
   - We may use trusted third-party providers (such as cloud hosting or email services) to support our operations.  
   - These providers are contractually obligated to maintain the confidentiality and security of your data.  

6. **Your Rights**  
   - You have the right to access, correct, or delete your personal information stored with us.  
   - You may request account deletion at any time, subject to applicable law.  

7. **Data Retention**  
   - We retain case data only as long as necessary to provide services or comply with legal obligations.  
   - Deleted case data is permanently removed from our systems within a reasonable timeframe.  

8. **Changes to Privacy Policy**  
   We may update this Privacy Policy from time to time. Continued use of LawgicalAi constitutes acceptance of the revised policy.  

9. **Contact Us**  
   If you have questions or concerns about this Privacy Policy, please contact us at:  
   **support@lawgikalai.com**
  `
    },

    2: {
      title: "Refund Policy",
      content: `
At LawgicalAi, we strive to provide a reliable and valuable service for legal professionals. This Refund Policy explains when and how refunds are processed.

1. **Subscription Plans**  
   - Payments for subscription plans (monthly, yearly, or otherwise) are non-refundable once the billing cycle begins.  
   - If you cancel your subscription, you will continue to have access until the end of your paid billing period, after which no further charges will apply.  

2. **One-Time Purchases**  
   - Payments for one-time services or features are generally non-refundable unless otherwise stated at the time of purchase.  

3. **Exceptional Refunds**  
   Refunds may be granted under the following circumstances:  
   - Duplicate or accidental charges.  
   - Proven technical issues that prevent you from using the service, where we are unable to resolve the issue.  
   - Legal requirements that mandate a refund.  

4. **Refund Request Process**  
   - To request a refund, please contact our support team at **support@lawgicalai.com** within **7 days** of the transaction.  
   - All requests will be reviewed, and approved refunds will be processed back to the original payment method within **7–14 business days**.  

5. **Free Trials and Promotional Offers**  
   - If a free trial is offered, you will not be charged until the trial period ends.  
   - Once converted into a paid subscription, normal refund rules apply.  

6. **Changes to Refund Policy**  
   LawgicalAi reserves the right to update this Refund Policy from time to time. Any changes will be communicated through the app or website.  

If you have any questions about this Refund Policy, please contact us at:  
**support@lawgicalai.com**
  `
    }, 
    3:{
      title: "High Court Calender",
      content: "https://lawgikalai-bucket.s3.ap-south-1.amazonaws.com/documents/high-court-calender.jpg"
    }

  };

  if (type in policies) {
    return res.json(policies[type]);
  } else {
    return res.status(400).json({ error: "Invalid type parameter. Use 0,1,2" });
  }
});

module.exports = router;