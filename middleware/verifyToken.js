const jwt = require('jsonwebtoken');

const generateToken = (userData) => {
    return jwt.sign(userData, process.env.JWT_SECRET, { expiresIn: 21600 }); // 6 hours
}

const verifyToken = (req, res, next) => {
  // 1️⃣ Try from cookie first
  const token = req.cookies?.token 
    // 2️⃣ Fallback to Authorization header if not in cookie
    || (req.headers['authorization']?.startsWith('Bearer ') 
        ? req.headers['authorization'].split(' ')[1] 
        : null);

  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // access later as req.user.userId
    next();
  } catch (err) {
    console.error("JWT verification error:", err.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
};


module.exports = {verifyToken, generateToken};