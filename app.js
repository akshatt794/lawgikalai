require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const app = express();

app.use(express.json());
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

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
