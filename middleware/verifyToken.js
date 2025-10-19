const jwt = require("jsonwebtoken");
const User = require("../models/User"); // ✅ Import user model

// Generate token
const generateToken = (userData) => {
  return jwt.sign(userData, process.env.JWT_SECRET, { expiresIn: 21600 }); // 6 hours
};

// Verify token + check active session
const verifyToken = async (req, res, next) => {
  try {
    // 1️⃣ Try from cookie first
    const token =
      req.cookies?.token ||
      (req.headers["authorization"]?.startsWith("Bearer ")
        ? req.headers["authorization"].split(" ")[1]
        : null);

    if (!token) {
      return res.status(401).json({ error: "Missing token" });
    }

    // 2️⃣ Decode JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.userId) {
      return res.status(401).json({ error: "Invalid token payload" });
    }

    // 3️⃣ Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 4️⃣ Check if token is active session
    const isActiveSession = user.activeSessions?.some(
      (session) => session.token === token
    );

    if (!isActiveSession) {
      return res
        .status(403)
        .json({ error: "Session expired or logged out from another device" });
    }

    // 5️⃣ Attach user info for downstream routes
    req.user = decoded;
    req.token = token;
    next();
  } catch (err) {
    console.error("JWT verification error:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

module.exports = { verifyToken, generateToken };