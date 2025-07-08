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
    await user.save();
    res.json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Signup error:', err); // This will log the real error to Render logs!
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
  const { otp } = req.body;
  const user = await User.findOne({ otp, otpExpires: { $gt: Date.now() } });
  if (!user) return res.status(400).json({ error: 'Invalid or expired OTP' });

  user.otp = undefined;
  user.otpExpires = undefined;
  await user.save();

  res.json({ message: 'OTP verified' });
});
router.get('/ping', (req, res) => {
  res.json({ status: 'ok' });
});


module.exports = router;
