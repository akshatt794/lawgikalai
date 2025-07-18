require('dotenv').config();

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const News = require('../models/News');
const verifyToken = require('../middleware/verifyToken');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

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
        email: user.identifier
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
    const { fullName, identifier, password } = req.body;
    if (!fullName || !identifier || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existing = await User.findOne({ identifier });
    if (existing) return res.status(409).json({ error: 'User already exists' });

    const hash = await bcrypt.hash(password, 10);
    const user = new User({ fullName, identifier, password: hash });

    const otp = '123456';
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    console.log(`OTP for ${identifier}: ${otp}`);

    res.json({
      message: "Signup successful. OTP sent to email.",
      user_id: user._id,
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
        email: user.identifier
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

    const possibleAreas = ["Criminal", "Civil", "Family", "Property", "Corporate", "IncomeTax"];
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
      "Criminal","Civil","Family","Property","Corporate","IncomeTax"
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

module.exports = router;
