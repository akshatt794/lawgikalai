require("dotenv").config();
const { generateOtp, sendCodeByEmail } = require("../utils/emailservice");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const News = require("../models/News");
const { verifyToken } = require("../middleware/verifyToken");
const { lightVerifyToken } = require("../middleware/lightVerifyToken");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// 🔒 Common cookie options (DO NOT affect JSON responses)
const COOKIE_OPTIONS = {
  httpOnly: true,
  // For cross-site frontends (different domain/port), 'none' is required & must be secure
  sameSite: "none",
  secure: true, // requires HTTPS in prod
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/",
};

const auth = (req, res, next) => {
  const header = req.headers.authorization;
  console.log(header);
  if (!header) return res.status(401).json({ error: "Missing token" });

  const token = header.split(" ")[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

//LOGIN
router.post("/login", async (req, res) => {
  try {
    const { identifier, password, deviceInfo } = req.body;
    const user = await User.findOne({ identifier });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    if (!user.isVerified) {
      return res
        .status(401)
        .json({ error: "Account not verified. Please check your OTP." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    // ✅ Clean up expired sessions (optional safety)
    user.activeSessions = (user.activeSessions || []).filter((session) => {
      try {
        const decoded = jwt.verify(session.token, JWT_SECRET);
        // if verify succeeds, token is still valid
        return true;
      } catch (err) {
        // remove expired/malformed tokens
        console.log("🧹 Removing expired token:", err.message);
        return false;
      }
    });
    // ✅ Save cleanup result
    await user.save();

    // If already logged in on 2 devices → return session info
    if (user.activeSessions.length >= 2) {
      return res.status(403).json({
        error: "DEVICE_LIMIT_REACHED",
        message: "You are logged in on 2 devices already.",
        activeSessions: user.activeSessions.map((s) => ({
          device: s.device,
          createdAt: s.createdAt,
          token: s.token,
        })),
      });
    }

    // ✅ Generate token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    // ✅ Save device session
    user.activeSessions.push({
      token,
      device: deviceInfo || req.headers["user-agent"] || "Unknown Device",
      createdAt: new Date(),
    });
    await user.save();

    res.json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.fullName,
        email: user.identifier,
        mobileNumber: user.mobileNumber,
        barCouncilId: user.barCouncilId,
        qualification: user.qualification,
        experience: user.experience,
        practiceArea: user.practiceArea,
        role: user.role,
        plan: user.plan || null,
        trial: user.trial || null,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// SIGNUP
router.post("/signup", async (req, res) => {
  try {
    const { fullName, identifier, password, mobileNumber } = req.body;
    if (!fullName || !identifier || !password || !mobileNumber) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Hash password early
    const hash = await bcrypt.hash(password, 10);

    // 1) Check by mobile number
    let existingUser = await User.findOne({ mobileNumber });
    if (existingUser) {
      if (existingUser.isVerified) {
        return res
          .status(409)
          .json({ error: "User with this mobile number already exists" });
      } else {
        // user exists but not verified → resend OTP
        const otp = generateOtp();
        existingUser.otp = otp;
        existingUser.otpExpires = Date.now() + 10 * 60 * 1000;
        existingUser.password = hash; // update password if re-trying
        existingUser.fullName = fullName;
        existingUser.identifier = identifier;
        await existingUser.save();
        sendCodeByEmail(identifier, otp);
        // console.log(`Resent OTP for ${identifier}: ${otp}`);

        return res.json({
          message: "Signup successful. OTP sent to email.",
          user_id: existingUser._id,
          mobileNumber: existingUser.mobileNumber,
          requires_verification: true,
        });
      }
    }

    // 2) Check by identifier
    existingUser = await User.findOne({ identifier });
    if (existingUser) {
      if (existingUser.isVerified) {
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
        return res.status(409).json({
          error: `User with this ${
            isEmail ? "email" : "identifier"
          } already exists`,
        });
      } else {
        // user exists but not verified → resend OTP
        const otp = generateOtp();
        existingUser.otp = otp;
        existingUser.otpExpires = Date.now() + 10 * 60 * 1000;
        existingUser.password = hash; // update password if re-trying
        existingUser.fullName = fullName;
        existingUser.mobileNumber = mobileNumber;
        await existingUser.save();
        sendCodeByEmail(identifier, otp);
        // console.log(`Resent OTP for ${identifier}: ${otp}`);

        return res.json({
          message: "Signup successful. OTP sent to email.",
          user_id: existingUser._id,
          mobileNumber: existingUser.mobileNumber,
          requires_verification: true,
        });
      }
    }

    // 3) If no existing user → create new one
    const user = new User({
      fullName,
      identifier,
      password: hash,
      mobileNumber,
    });
    console.log("Please help " + identifier);
    const otp = generateOtp();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();
    sendCodeByEmail(identifier, otp);
    console.log(`OTP for ${identifier}: ${otp}`);

    return res.json({
      message: "Signup successful. OTP sent to email.",
      user_id: user._id,
      mobileNumber: user.mobileNumber,
      requires_verification: true,
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// FORGOT PASSWORD
router.post("/forgot-password", async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({ error: "Identifier is required" });
    }

    // Determine if identifier is email or mobile number
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    const isMobile = /^[0-9]{10}$/.test(identifier); // adjust if needed

    let query = {};
    if (isEmail) {
      query = { identifier }; // assuming identifier field stores email too
    } else if (isMobile) {
      query = { mobileNumber: identifier };
    } else {
      return res.status(400).json({ error: "Invalid identifier format" });
    }

    let user = await User.findOne(query);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Generate OTP
    const otp = generateOtp();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();
    sendCodeByEmail(user.identifier, otp);

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET);

    console.log(`Forgot-password OTP for ${user.identifier}: ${otp}`);

    return res.json({
      message: `OTP sent to ${
        isEmail ? "email" : "mobile"
      } for password reset.`,
      user_id: user._id,
      requires_verification: !user.isVerified, // true if user not verified
      token,
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// confirm password
router.post("/confirm-password", verifyToken, async (req, res) => {
  try {
    const { newPassword, token } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    await user.save();

    res.json({ message: "Password changed successfully", token });
  } catch (err) {
    console.error("Change password error:", err);
    res
      .status(500)
      .json({ error: "Server error", details: err.message, token });
  }
});

// router.post('/forgot-password', async (req, res) => {
//   try {
//     const { identifier } = req.body;

//     if (!identifier) {
//       return res.status(400).json({ error: 'Identifier is required' });
//     }

//     // Determine if identifier is email or mobile number
//     const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
//     const isMobile = /^[0-9]{10}$/.test(identifier); // adjust if needed

//     let query = {};
//     if (isEmail) {
//       query = { identifier }; // assuming identifier field stores email too
//     } else if (isMobile) {
//       query = { mobileNumber: identifier };
//     } else {
//       return res.status(400).json({ error: 'Invalid identifier format' });
//     }

//     let user = await User.findOne(query);

//     if (!user) {
//       return res.status(404).json({ error: 'User not found' });
//     }

//     // Generate OTP
//     const otp = generateOtp();
//     user.otp = otp;
//     user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
//     await user.save();
//     sendCodeByEmail(user.email, otp);

//     // Generate JWT token
//     const token = jwt.sign({ userId: user._id }, JWT_SECRET);

//     console.log(`Forgot-password OTP for ${user.identifier}: ${otp}`);

//     return res.json({
//       message: `OTP sent to ${isEmail ? 'email' : 'mobile'} for password reset.`,
//       user_id: user._id,
//       requires_verification: !user.isVerified, // true if user not verified
//       token
//     });
//   } catch (err) {
//     console.error('Forgot password error:', err);
//     res.status(500).json({ error: 'Server error', details: err.message });
//   }
// });

// CHANGE PASSWORD
router.put("/change-password", verifyToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: "Old and new passwords are required" });
    }

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Old password is incorrect" });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// VERIFY OTP
router.post("/verify-otp", async (req, res) => {
  try {
    const { user_id, otp, deviceInfo } = req.body;
    console.log(req.body);
    if (!user_id || !otp) {
      return res.status(400).json({ error: "User ID and OTP are required" });
    }

    const user = await User.findById(user_id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // if (user.isVerified) {
    //   return res.json({ message: 'User already verified.' });
    // }

    if (user.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    if (user.otpExpires < Date.now()) {
      return res.status(400).json({ error: "OTP expired" });
    }

    // Mark user as verified
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    // Clean expired sessions
    user.activeSessions = (user.activeSessions || []).filter((session) => {
      try {
        jwt.verify(session.token, JWT_SECRET);
        return true;
      } catch {
        return false;
      }
    });

    // Enforce 2-device limit
    if (user.activeSessions.length >= 2) {
      return res.status(403).json({
        error: "DEVICE_LIMIT_REACHED",
        message: "You are logged in on 2 devices already.",
        activeSessions: user.activeSessions.map((s) => ({
          device: s.device,
          createdAt: s.createdAt,
          token: s.token,
        })),
      });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    // Add new active session
    user.activeSessions.push({
      token,
      device: deviceInfo || req.headers["user-agent"] || "Unknown Device",
      createdAt: new Date(),
    });

    await user.save();

    res.json({
      message: "OTP verified successfully.",
      token,
      user: {
        id: user._id,
        name: user.fullName,
        email: user.identifier,
        mobileNumber: user.mobileNumber,
        barCouncilId: user.barCouncilId,
        qualification: user.qualification,
        experience: user.experience,
        practiceArea: user.practiceArea,
        role: user.role,
        plan: user.plan || null,
        trial: user.trial || null,
      },
    });
  } catch (err) {
    console.error("OTP verification error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// RESEND OTP
router.post("/resend-otp", async (req, res) => {
  try {
    const { user_id } = req.body;
    const user = await User.findById(user_id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const otp = "123456";
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    console.log(`OTP for ${user.identifier}: ${otp}`);
    res.json({ message: "OTP resent to email." });
  } catch (err) {
    console.error("Resend OTP error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// GET PROFILE
router.get("/profile", lightVerifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const practiceAreas = Array.isArray(user.practiceArea)
      ? user.practiceArea
      : [];
    const possibleAreas = [
      "Criminal",
      "Civil",
      "Family",
      "Property",
      "Corporate",
      "IncomeTax",
      "Arbitration",
      "Others",
    ];

    const practice_areas = {};
    possibleAreas.forEach((area) => {
      practice_areas[area] = practiceAreas.includes(area);
    });

    res.json({
      full_name: user.fullName,
      mobile_number: user.mobileNumber,
      email: user.email || user.identifier,
      bar_council_id: user.barCouncilId,
      qualification: user.qualification,
      experience: user.experience,
      practice_areas,
      role: user.role,
      plan: user.plan || null,
      trial: user.trial || null,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// UPDATE PROFILE
router.put("/profile", lightVerifyToken, async (req, res) => {
  try {
    const {
      full_name,
      mobile_number,
      email,
      bar_council_id,
      qualification,
      experience,
      practiceArea,
      practice_areas,
    } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user)
      return res.status(404).json({ message: "User not found", status: false });

    if (full_name || req.body.fullName)
      user.fullName = full_name || req.body.fullName;
    if (mobile_number || req.body.mobileNumber)
      user.mobileNumber = mobile_number || req.body.mobileNumber;
    if (email) user.email = email;
    if (bar_council_id || req.body.barCouncilId)
      user.barCouncilId = bar_council_id || req.body.barCouncilId;
    if (qualification) user.qualification = qualification;
    if (experience) user.experience = experience;

    let practiceAreaArray = user.practiceArea || [];
    if (Array.isArray(practiceArea)) {
      practiceAreaArray = practiceArea;
    } else if (practice_areas && typeof practice_areas === "object") {
      practiceAreaArray = [];
      Object.keys(practice_areas).forEach((area) => {
        if (practice_areas[area]) practiceAreaArray.push(area);
      });
    }
    user.practiceArea = practiceAreaArray;

    await user.save();

    const areaList = Array.from(
      new Set([
        ...Object.keys(practice_areas || {}),
        ...(Array.isArray(user.practiceArea) ? user.practiceArea : []),
        "Criminal",
        "Civil",
        "Family",
        "Property",
        "Corporate",
        "IncomeTax",
        "Arbitration",
        "Others",
      ])
    );

    const resultPracticeAreas = {};
    areaList.forEach((area) => {
      resultPracticeAreas[area] = user.practiceArea.includes(area);
    });

    res.json({
      message: "Profile updated successfully",
      status: true,
      data: {
        full_name: user.fullName || "",
        mobile_number: user.mobileNumber || "",
        email: user.email || "",
        bar_council_id: user.barCouncilId || "",
        qualification: user.qualification || "",
        experience: user.experience || "",
        practice_areas: resultPracticeAreas,
      },
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to update profile",
      status: false,
      error: err.message,
    });
  }
});

// DELETE PROFILE
router.delete("/profile", verifyToken, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.userId);
    res.json({ message: "Profile deleted" });
  } catch (err) {
    console.error("Profile delete error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// GET ALL USERS
router.get("/all-users", verifyToken, async (req, res) => {
  try {
    const users = await User.find({}, "-password -otp -otpExpires");
    res.json({ users });
  } catch (err) {
    console.error("All users fetch error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// Save News (Bookmark)
router.post("/save/:newsId", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!user.savedNews.includes(req.params.newsId)) {
      user.savedNews.push(req.params.newsId);
      await user.save();
    }

    res.json({ message: "News saved" });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// DELETE ACCOUNT
router.delete("/delete-account", auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    await User.findByIdAndDelete(userId);
    res.json({ message: "Account deleted successfully" });
  } catch (err) {
    console.error("Delete account error:", err);
    res
      .status(500)
      .json({ error: "Failed to delete account", details: err.message });
  }
});

// LOGOUT
// ✅ LOGOUT ROUTE (Secure and Session-Aware)
router.post("/logout", verifyToken, async (req, res) => {
  try {
    const token = req.token; // from verifyToken
    const user = await User.findById(req.user.userId);

    if (!user) return res.status(404).json({ error: "User not found" });

    const before = user.activeSessions?.length || 0;

    // 🧹 Remove only this token from active sessions
    user.activeSessions = user.activeSessions.filter(
      (session) => session.token !== token
    );

    await user.save();

    const after = user.activeSessions?.length || 0;

    // 🧹 Clear cookie (if present)
    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "none",
      secure: false,
      path: "/",
    });

    res.json({
      message:
        before !== after
          ? "Logout successful."
          : "No active session found (possibly already logged out).",
      remaining_sessions: after,
    });
  } catch (err) {
    console.error("Logout error:", err.message);
    res.status(500).json({ error: "Logout failed", details: err.message });
  }
});

// LOGIN WITH PHONE NUMBER
router.post("/login-phone", async (req, res) => {
  try {
    const { mobileNumber, password, deviceInfo } = req.body;

    if (!mobileNumber || !password) {
      return res
        .status(400)
        .json({ error: "Mobile number and password are required" });
    }

    const user = await User.findOne({ mobileNumber });
    if (!user)
      return res
        .status(401)
        .json({ error: "Invalid mobile number or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res
        .status(401)
        .json({ error: "Invalid mobile number or password" });

    // 🧹 Clean expired sessions (optional safety)
    user.activeSessions = (user.activeSessions || []).filter((session) => {
      try {
        jwt.verify(session.token, JWT_SECRET);
        return true;
      } catch {
        return false;
      }
    });

    // 🚫 Enforce max 2 devices per user
    // If already logged in on 2 devices → return session info
    if (user.activeSessions.length >= 2) {
      return res.status(403).json({
        error: "DEVICE_LIMIT_REACHED",
        message: "You are logged in on 2 devices already.",
        activeSessions: user.activeSessions.map((s) => ({
          device: s.device,
          createdAt: s.createdAt,
          token: s.token,
        })),
      });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || "your_jwt_secret"
    );

    // 💾 Save session info
    user.activeSessions.push({
      token,
      device: deviceInfo || req.headers["user-agent"] || "Unknown Device",
      createdAt: new Date(),
    });

    await user.save();

    // ✅ Set cookie (response body unchanged)
    res.cookie("token", token, COOKIE_OPTIONS);

    res.json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.fullName,
        email: user.email,
        mobileNumber: user.mobileNumber,
        role: user.role,
        plan: user.plan || null,
        trial: user.trial || null,
        qualification: user.qualification,
        experience: user.experience,
        practiceArea: user.practiceArea,
        barCouncilId: user.barCouncilId,
      },
    });
  } catch (err) {
    console.error("Login (phone) error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// ===============================================
// 🧩 TOGGLE USER ROLE (Admin ↔ User)
// ===============================================
router.put("/toggle-role/:id", verifyToken, async (req, res) => {
  try {
    const requester = await User.findById(req.user.userId);
    if (!requester)
      return res.status(404).json({ error: "Requester not found" });

    // ✅ Only admin can change roles
    if (requester.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ error: "User not found" });

    // ✅ Toggle logic
    targetUser.role = targetUser.role === "admin" ? "user" : "admin";
    await targetUser.save();

    res.json({
      message: `User role updated successfully to '${targetUser.role}'.`,
      userId: targetUser._id,
      newRole: targetUser.role,
    });
  } catch (err) {
    console.error("Toggle role error:", err);
    res
      .status(500)
      .json({ error: "Failed to toggle role", details: err.message });
  }
});

// ✅ Activate 7-day free trial
router.post("/start-trial", lightVerifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.role === "admin") {
      return res.json({ message: "Admin users do not need a trial or plan." });
    }

    // check if already on plan or trial
    if (user.trial.started || user.plan?.name) {
      return res.status(400).json({ error: "Trial or plan already active." });
    }

    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + 7);

    user.trial = {
      started: true,
      startDate: start,
      endDate: end,
    };

    await user.save();

    res.json({
      message: "Trial activated successfully!",
      trial: user.trial,
    });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to start trial", details: err.message });
  }
});

// ✅ Logout from specific session (by token)
router.post("/logout-session", async (req, res) => {
  try {
    const { tokenToRemove, mobileNumber, identifier } = req.body;

    if (!tokenToRemove) {
      return res.status(400).json({ error: "tokenToRemove is required" });
    }

    // Find user by searching who has this session token
    const user = await User.findOne({
      activeSessions: { $elemMatch: { token: tokenToRemove } },
    });

    if (!user) {
      return res.status(404).json({
        error: "Session not found or already removed",
      });
    }

    // Remove that session
    user.activeSessions = user.activeSessions.filter(
      (s) => s.token !== tokenToRemove
    );

    await user.save();

    res.json({
      message: "Session removed successfully.",
      remainingSessions: user.activeSessions,
    });
  } catch (err) {
    res.status(500).json({
      error: "Failed to remove session",
      details: err.message,
    });
  }
});

module.exports = router;
