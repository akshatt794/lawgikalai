require('dotenv').config();
require('dotenv').config({ path: '.env.firebase' });

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Route imports
const authRoutes = require('./routes/auth');
const newsRoutes = require('./routes/news');
const exploreCourtRoutes = require('./routes/exploreCourt');
const homeRoutes = require('./routes/home');
const caseRoutes = require('./routes/case');
const documentRoutes = require('./routes/document');
const ordersRoutes = require('./routes/orders');
const announcementRoutes = require('./routes/announcements');
const subscriptionRoutes = require('./routes/subscription');
const courtRoutes = require('./routes/courts');
const notificationRoutes = require('./routes/notifications');

const servePath = process.env.NODE_ENV === 'production' ? '/tmp' : 'uploads';


const app = express();

// 1. CORS
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://lawgikalai-admin.netlify.app'
  ],
  credentials: true
}));

// 2. Parse JSON
app.use(express.json());

// 3. Serve uploads folder as static
app.use('/uploads', express.static('uploads', {
  setHeaders: (res, path) => {
    if (path.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline'); // ✅ forces open in new tab
    }
  }
}));


console.log({
  authRoutes,
  newsRoutes,
  exploreCourtRoutes,
  homeRoutes,
  caseRoutes,
  documentRoutes,
  ordersRoutes,
  announcementRoutes,
  subscriptionRoutes,
  courtRoutes,
  notificationRoutes,
  aiDrafting: require('./routes/aiDrafting'),
});

// 4. API routes
app.use('/api/auth', authRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/explore', exploreCourtRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/case', caseRoutes);
app.use('/api/documents', documentRoutes); // Updated path
app.use('/api/orders', ordersRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/ai', require('./routes/aiDrafting'));
app.use('/api/explore/courts', courtRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api', ordersRoutes);
app.use(express.json());
// 5. Base route
app.get('/', (req, res) => {
  res.send('Welcome to Lawgikalai Auth API! 🚀');
});

// 6. MongoDB Connect
mongoose.connect(process.env.MONGODB_URI, {
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
app.listen(3000, '0.0.0.0', () => {
  console.log('Server running on 0.0.0.0:3000');
});
