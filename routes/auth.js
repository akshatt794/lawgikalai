const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// JWT authentication middleware
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

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const user = await User.findOne({ identifier });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { userId: user._id },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.fullName,
        email: user.identifier // Change to user.email if you add that field
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

    // Use static OTP for now
    const otp = '123456';
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;

    await user.save();

    // (Pretend to send OTP by email here, or just log it for now)
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

    // Use static OTP for now
    const otp = '123456';
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    // (Pretend to send OTP via email)
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

    // Only accept '123456' as a valid OTP
    if (otp !== '123456') {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Find user by user_id
    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // (Optionally clear any otp fields, if you want)
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      message: "OTP verified successfully.",
      token,
      user: {
        id: user._id,
        name: user.fullName,
        email: user.identifier // (or user.email if you add that field)
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

    const otp = '123456'; // static OTP for now
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    // (Pretend to send OTP via email)
    console.log(`OTP for ${user.identifier}: ${otp}`);

    res.json({ message: 'OTP resent to email.' });
  } catch (err) {
    console.error('Resend OTP error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// GET PROFILE
// GET PROFILE
// GET PROFILE (returns all requested fields)
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      'fullName mobileNumber email barCouncilId qualification experience practiceArea'
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      fullName: user.fullName || "",
      mobileNumber: user.mobileNumber || "",
      email: user.email || "",
      barCouncilId: user.barCouncilId || "",
      qualification: user.qualification || "",
      experience: user.experience || "",
      practiceArea: user.practiceArea || []
    });
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});



// UPDATE PROFILE (fully updated for your requested fields)
router.put('/profile', auth, async (req, res) => {
  try {
    const {
      fullName,
      mobileNumber,
      email,
      barCouncilId,
      qualification,
      experience,
      practiceArea
    } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found', status: false });

    if (fullName) user.fullName = fullName;
    if (mobileNumber) user.mobileNumber = mobileNumber;
    if (email) user.email = email;
    if (barCouncilId) user.barCouncilId = barCouncilId;
    if (qualification) user.qualification = qualification;
    if (experience) user.experience = experience;
    if (practiceArea) user.practiceArea = practiceArea;

    await user.save();
    res.json({
      message: 'Profile updated successfully',
      status: true
    });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ message: 'Failed to update profile', status: false });
  }
});

// DELETE PROFILE
router.delete('/profile', auth, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.userId);
    res.json({ message: 'Profile deleted' });
  } catch (err) {
    console.error('Profile delete error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// GET ALL USERS (Protected, use only for admin panel)
router.get('/all-users', auth, async (req, res) => {
  try {
    // Optional: Add admin-only check here in the future
    const users = await User.find({}, "-password -otp -otpExpires"); // exclude sensitive fields
    res.json({ users });
  } catch (err) {
    console.error('All users fetch error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

module.exports = router;
