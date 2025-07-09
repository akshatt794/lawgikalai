require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const newsRoutes = require('./routes/news');
const cors = require('cors');

const app = express();

// CORS: allow localhost (dev) and Netlify (prod)
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://lawgikalai-admin.netlify.app"
  ],
  credentials: true // Optional, only if you use cookies/auth
}));

app.use(express.json());

app.use('/api/news', newsRoutes);
app.use('/api/auth', authRoutes);

// Connect to MongoDB using the URI from the .env file
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch((err) => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 3000;
app.get("/", (req, res) => {
  res.send("Welcome to Lawgikalai Auth API! 🚀");
});
// Top-level error handler (shows any uncaught errors)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Something broke!', details: err.message });
});

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
