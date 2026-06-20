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

// Routes
const leadRoutes = require('./routes/leadRoutes');
app.use('/api/leads', leadRoutes);

// Database connection
const PORT = process.env.PORT || 5000;
let MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI && process.env.MONGODB_USERNAME && process.env.MONGODB_PASSWORD) {
  MONGODB_URI = `mongodb+srv://${encodeURIComponent(process.env.MONGODB_USERNAME)}:${encodeURIComponent(process.env.MONGODB_PASSWORD)}@cluster0.bdba3mi.mongodb.net/?appName=Cluster0`;
}

// If the URI contains deprecated options (often copied from older Atlas snippets), strip them out
if (MONGODB_URI) {
  MONGODB_URI = MONGODB_URI.replace(/&?useNewUrlParser=true/gi, '');
  MONGODB_URI = MONGODB_URI.replace(/&?useUnifiedTopology=true/gi, '');
  MONGODB_URI = MONGODB_URI.replace(/\?&/, '?').replace(/\?$/, '');
}

mongoose.connect(MONGODB_URI).then(() => {
  console.log('Connected to MongoDB');
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch((error) => {
  console.error('Error connecting to MongoDB:', error.message);
});
