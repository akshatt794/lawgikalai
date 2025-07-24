require('dotenv').config();

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const News = require('../models/News');
const verifyToken = require('../middleware/verifyToken');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

const auth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Missing token' });

  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const user = await User.findOne({ identifier });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET);

    res.json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.fullName,
        email: user.identifier,
        mobileNumber: user.phoneNumber
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// SIGNUP
router.post('/signup', async (req, res) => {
  try {
    const { fullName, identifier, password, phoneNumber } = req.body;
    if (!fullName || !identifier || !password || !phoneNumber) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existing = await User.findOne({ identifier });
    if (existing) return res.status(409).json({ error: 'User already exists' });

    const hash = await bcrypt.hash(password, 10);
    const user = new User({ fullName, identifier, password: hash, phoneNumber });

    const otp = '123456';
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    console.log(`OTP for ${identifier}: ${otp}`);

    res.json({
      message: "Signup successful. OTP sent to email.",
      user_id: user._id,
      mobileNumber: user.phoneNumber,
      requires_verification: true
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// FORGOT PASSWORD
router.post('/forgot-password', async (req, res) => {
  try {
    const { identifier } = req.body;
    const user = await User.findOne({ identifier });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const otp = '123456';
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    console.log(`OTP for ${identifier}: ${otp}`);

    res.json({
      message: "OTP sent to email.",
      user_id: user._id
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// VERIFY OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { user_id, otp } = req.body;

    if (otp !== '123456') {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    const user = await User.findById(user_id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    const token = jwt.sign({ userId: user._id }, JWT_SECRET);

    res.json({
      message: "OTP verified successfully.",
      token,
      user: {
        id: user._id,
        name: user.fullName,
        email: user.identifier,
        mobileNumber: user.phoneNumber  // ✅ Add this line
      }
    });
  } catch (err) {
    console.error('OTP verification error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// RESEND OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { user_id } = req.body;
    const user = await User.findById(user_id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const otp = '123456';
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    console.log(`OTP for ${user.identifier}: ${otp}`);
    res.json({ message: 'OTP resent to email.' });
  } catch (err) {
    console.error('Resend OTP error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// GET PROFILE
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const result = {
      full_name: user.fullName || "NIL",
      mobile_number: user.mobileNumber || "NIL",
      email: user.email || "NIL",
      bar_council_id: user.barCouncilId || "NIL",
      qualification: user.qualification || "NIL",
      experience: user.experience || "NIL",
      practice_areas: {}
    };

    const possibleAreas = ["Criminal", "Civil", "Family", "Property", "Corporate", "IncomeTax", "Arbitration", "Others"];
    possibleAreas.forEach(area => {
      result.practice_areas[area] = user.practiceArea?.includes(area) || false;
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// UPDATE PROFILE
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const {
      full_name, mobile_number, email, bar_council_id,
      qualification, experience, practiceArea, practice_areas
    } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found", status: false });

    if (full_name || req.body.fullName) user.fullName = full_name || req.body.fullName;
    if (mobile_number || req.body.mobileNumber) user.mobileNumber = mobile_number || req.body.mobileNumber;
    if (email) user.email = email;
    if (bar_council_id || req.body.barCouncilId) user.barCouncilId = bar_council_id || req.body.barCouncilId;
    if (qualification) user.qualification = qualification;
    if (experience) user.experience = experience;

    let practiceAreaArray = user.practiceArea || [];
    if (Array.isArray(practiceArea)) {
      practiceAreaArray = practiceArea;
    } else if (practice_areas && typeof practice_areas === 'object') {
      practiceAreaArray = [];
      Object.keys(practice_areas).forEach(area => {
        if (practice_areas[area]) practiceAreaArray.push(area);
      });
    }
    user.practiceArea = practiceAreaArray;

    await user.save();

    const areaList = Array.from(new Set([
      ...Object.keys(practice_areas || {}),
      ...(Array.isArray(user.practiceArea) ? user.practiceArea : []),
      "Criminal", "Civil", "Family", "Property", "Corporate", "IncomeTax", "Arbitration", "Others"
    ]));

    const resultPracticeAreas = {};
    areaList.forEach(area => {
      resultPracticeAreas[area] = user.practiceArea.includes(area);
    });

    res.json({
      message: "Profile updated successfully",
      status: true,
      data: {
        full_name: user.fullName || "NIL",
        mobile_number: user.mobileNumber || "NIL",
        email: user.email || "NIL",
        bar_council_id: user.barCouncilId || "NIL",
        qualification: user.qualification || "NIL",
        experience: user.experience || "NIL",
        practice_areas: resultPracticeAreas
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to update profile", status: false, error: err.message });
  }
});

// DELETE PROFILE
router.delete('/profile', verifyToken, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.userId);
    res.json({ message: 'Profile deleted' });
  } catch (err) {
    console.error('Profile delete error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// GET ALL USERS
router.get('/all-users', verifyToken, async (req, res) => {
  try {
    const users = await User.find({}, "-password -otp -otpExpires");
    res.json({ users });
  } catch (err) {
    console.error('All users fetch error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Save News (Bookmark)
router.post('/save/:newsId', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.savedNews.includes(req.params.newsId)) {
      user.savedNews.push(req.params.newsId);
      await user.save();
    }

    res.json({ message: 'News saved' });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// DELETE ACCOUNT
router.delete('/delete-account', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    await User.findByIdAndDelete(userId);
    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Failed to delete account', details: err.message });
  }
});

// LOGOUT
router.post('/logout', auth, async (req, res) => {
  try {
    res.json({ message: 'Logout successful. Please clear your token on client side.' });
  } catch (err) {
    res.status(500).json({ error: 'Logout failed', details: err.message });
  }
});

// LOGIN WITH PHONE NUMBER
router.post('/login-phone', async (req, res) => {
  try {
    const { mobileNumber, password } = req.body;

    if (!mobileNumber || !password) {
      return res.status(400).json({ error: 'Mobile number and password are required' });
    }

    const user = await User.findOne({ mobileNumber });
    if (!user) return res.status(401).json({ error: 'Invalid mobile number or password' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid mobile number or password' });

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your_jwt_secret'
    );

    res.json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.fullName,
        email: user.email,
        mobileNumber: user.mobileNumber
      }
    });
  } catch (err) {
    console.error('Login (phone) error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

module.exports = router;
