require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Route imports
const authRoutes = require('./routes/auth');
const newsRoutes = require('./routes/news');
const exploreRoutes = require('./routes/explore');
const homeRoutes = require('./routes/home');
const caseRoutes = require('./routes/case');
const documentRoutes = require('./routes/document');
const ordersRoutes = require('./routes/orders');

// Serve correct uploads directory (tmp for production on Render)
const servePath = process.env.NODE_ENV === 'production' ? '/tmp' : 'uploads';

const app = express();

// 1. CORS (VERY TOP)
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://lawgikalai-admin.netlify.app"
  ],
  credentials: true
}));

// 2. Parse JSON
app.use(express.json());

// 3. Serve uploads folder as static (PDF/image access)
app.use('/uploads', express.static(servePath));

// 4. API routes
app.use('/api/auth', authRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/explore', exploreRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/case', caseRoutes);
app.use('/api', documentRoutes);
app.use('/api/orders', ordersRoutes);

// 5. Base route
app.get("/", (req, res) => {
  res.send("Welcome to Lawgikalai Auth API! 🚀");
});

// 6. MongoDB Connect
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch((err) => console.error('MongoDB connection error:', err));

// 7. Top-level error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Something broke!', details: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
