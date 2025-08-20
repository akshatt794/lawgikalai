require('dotenv').config();
require('dotenv').config({ path: '.env.firebase' });

const fs = require('fs');
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');

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
const testDocumentDbRoute = require('./routes/test-documentdb');
const aiDraftingRoutes = require('./routes/aiDrafting');

const app = express();

/* ================== MIDDLEWARE ================== */

// CORS
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://lawgikalai-admin.netlify.app',
  ],
  credentials: true,
}));

// Body + cookies
app.use(express.json());
app.use(cookieParser());

// Serve uploads as static
app.use('/uploads', express.static('uploads', {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
    }
  }
}));

/* ================== ROUTES ================== */

app.use('/api/auth', authRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/explore', exploreCourtRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/case', caseRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/ai', aiDraftingRoutes);
app.use('/api/explore/courts', courtRoutes);
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api', ordersRoutes); // (you had this duplicate mount; keeping as-is)
app.use('/api/test', testDocumentDbRoute);

// Health / base
app.get('/', (_req, res) => {
  res.send('Welcome to Lawgikalai Auth API! 🚀');
});

/* ================== DATABASE CONNECT & SERVER START ================== */

// Make mongoose fail fast instead of buffering queries for 10s
mongoose.set('bufferCommands', false);
mongoose.set('bufferTimeoutMS', 0);

const DOCUMENTDB_URI = process.env.DOCUMENTDB_URI;
// Use the CA bundle you downloaded to ~/aws
const TLS_CA_FILE = '/home/ubuntu/aws/rds-combined-ca-bundle.pem';

// Honor env port, default 4000 so we avoid conflicts with anything stuck on 3000
const PORT = Number(process.env.PORT) || 4000;

async function start() {
  try {
    await mongoose.connect(DOCUMENTDB_URI, {
      tlsCAFile: TLS_CA_FILE,         // ✅ correct CA file
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      // ❗ Do NOT include deprecated options in Mongoose v6+:
      // useNewUrlParser / useUnifiedTopology are ignored and emit warnings
    });
    console.log('✅ Connected to DocumentDB');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server running on 0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error('❌ DocumentDB connection error:', err);
    process.exit(1); // fail fast so PM2 restarts after you fix networking/URI
  }
}

start();

module.exports = app;
