require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const leadRoutes = require('./routes/leadRoutes');
app.use('/api/leads', leadRoutes);

// Database connection
const PORT = process.env.PORT || 5000;
let MONGODB_URI = process.env.MONGODB_URI || '';

// If the URI contains deprecated options (often copied from older Atlas snippets), strip them out
MONGODB_URI = MONGODB_URI.replace(/&?useNewUrlParser=true/gi, '');
MONGODB_URI = MONGODB_URI.replace(/&?useUnifiedTopology=true/gi, '');
MONGODB_URI = MONGODB_URI.replace(/\?&/, '?').replace(/\?$/, '');

mongoose.connect(MONGODB_URI).then(() => {
  console.log('Connected to MongoDB');
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch((error) => {
  console.error('Error connecting to MongoDB:', error.message);
});
