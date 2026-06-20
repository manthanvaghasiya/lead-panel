require('dotenv').config();
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  console.warn('Failed to set public DNS servers:', e.message);
}
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Database connection config
const PORT = process.env.PORT || 5000;
let MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI && process.env.MONGODB_USERNAME && process.env.MONGODB_PASSWORD) {
  MONGODB_URI = `mongodb+srv://${encodeURIComponent(process.env.MONGODB_USERNAME)}:${encodeURIComponent(process.env.MONGODB_PASSWORD)}@cluster0.bdba3mi.mongodb.net/?appName=Cluster0`;
}

if (MONGODB_URI) {
  MONGODB_URI = MONGODB_URI.replace(/&?useNewUrlParser=true/gi, '');
  MONGODB_URI = MONGODB_URI.replace(/&?useUnifiedTopology=true/gi, '');
  MONGODB_URI = MONGODB_URI.replace(/\?&/, '?').replace(/\?$/, '');
}

// Middleware to ensure DB connection is ready on every request (crucial for Serverless environments)
app.use(async (req, res, next) => {
  if (mongoose.connection.readyState === 1) {
    return next();
  }
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB via middleware');
    next();
  } catch (error) {
    console.error('Database connection failed in middleware:', error.message);
    res.status(500).json({ message: "Database connection failed: " + error.message });
  }
});

// Routes
const leadRoutes = require('./routes/leadRoutes');
app.use(['/_/backend/api/leads', '/api/leads'], leadRoutes);


if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
