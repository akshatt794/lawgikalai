const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

const JWT_SECRET = 'your_jwt_secret';

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// LOGIN
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body;
  const user = await User.findOne({ identifier });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
});

// SIGNUP
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

    // Generate OTP and set expiration (10 min)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;

    await user.save();

    // (Optional: send OTP by email here, or just log it for now)
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
  const { identifier } = req.body;
  const user = await User.findOne({ identifier });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const otp = generateOTP();
  user.otp = otp;
  user.otpExpires = Date.now() + 10 * 60 * 1000;
  await user.save();

  // In production, send OTP via email or SMS
  console.log(`OTP for ${identifier}: ${otp}`);

  res.json({ message: 'OTP sent' });
});

// VERIFY OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { user_id, otp } = req.body;

    // Find user by ID and OTP (and OTP must not be expired)
    const user = await User.findOne({ _id: user_id, otp, otpExpires: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ error: 'Invalid or expired OTP' });

    // OTP is correct, clear it
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '8h' }
    );

    res.json({
      message: "OTP verified successfully.",
      token,
      user: {
        id: user._id,
        name: user.fullName,
        email: user.identifier  // Change to user.email if you have an email field
      }
    });
  } catch (err) {
    console.error('OTP verification error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});



module.exports = router;
