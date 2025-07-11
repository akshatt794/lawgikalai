const express = require('express');
const router = express.Router();

// JWT Middleware (reuse from your auth.js)
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Missing token' });
  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

router.get('/', auth, async (req, res) => {
  // TODO: Replace these with actual database queries if needed
  res.json({
    status: "success",
    message: "Home data fetched successfully",
    data: {
      total_cases: 15,
      upcoming_hearings: 3,
      closed_cases: 6,
      news: [
        {
          id: "n1",
          title: "Supreme Court Issues New Guidelines",
          description: "The Supreme Court has issued a new set of guidelines for...",
          image_url: "https://example.com/images/news1.jpg",
          created_at: "2025-07-10T09:00:00Z"
        },
        {
          id: "n2",
          title: "High Court Dismisses Petition",
          description: "The Delhi High Court has dismissed a petition regarding...",
          image_url: "https://example.com/images/news2.jpg",
          created_at: "2025-07-09T14:30:00Z"
        }
      ],
      announcements: [
        {
          id: "a1",
          title: "Maintenance Scheduled",
          message: "Our services will be down for maintenance on July 15 from 2 AM to 5 AM.",
          date: "2025-07-11"
        },
        {
          id: "a2",
          title: "New Feature Released",
          message: "We have released a new case tracking feature in the app.",
          date: "2025-07-08"
        }
      ]
    }
  });
});

module.exports = router;
