const jwt = require("jsonwebtoken");
const User = require("../models/User");

const lightVerifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing token" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.userId) {
      return res.status(401).json({ error: "Invalid token payload" });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    req.user = decoded;
    next();
  } catch (err) {
    console.error("Light token verification error:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

module.exports = { lightVerifyToken };
