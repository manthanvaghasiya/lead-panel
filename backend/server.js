/**
 * @file server.js
 * @layer Application Entrypoint / Server Hardening
 * @description Hardened Express server implementing Helmet CSP, Strict CORS, Cookie-Based Sessions,
 * General DDoS/Scraping Rate Limiting, and Fail-Secure Global Exception Handling.
 *
 * Mitigates:
 * - OWASP A05:2021 (Security Misconfiguration - Clickjacking, MIME-Sniffing, Permissive CORS)
 * - OWASP A04:2021 (Insecure Design - Information Disclosure via Stack Traces)
 * - CWE-209 (Generation of Error Message Containing Sensitive Information)
 */

require('dotenv').config();
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  console.warn('Failed to set public DNS servers:', e.message);
}

const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');

const { configuredCors, configuredHelmet } = require('./middleware/securityHeaders');
const { generalApiLimiter } = require('./middleware/rateLimiters');
const { noSqlSanitizerMiddleware } = require('./validators/schemas');
const { protect } = require('./middleware/authMiddleware');

const app = express();

// 1. Edge & Transport Security (Helmet CSP + Strict CORS)
app.use(configuredHelmet);
app.use(configuredCors);

// 2. Sliding Window DDoS & General Scraping Protection
app.use(generalApiLimiter);

// 3. Body Parsing with Safe Maximum Payload Quotas (Prevents Memory Exhaustion DoS)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 4. Secure Cookie Parsing for HttpOnly SameSite=Strict JWT Session Tokens
app.use(cookieParser());

// 5. Deep NoSQL Injection Sanitizer
app.use(noSqlSanitizerMiddleware);

// 6. Database Connection Management
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
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not configured.');
    }
    await mongoose.connect(MONGODB_URI);
    next();
  } catch (error) {
    console.error('[DB-CONNECT] Connection failed:', error.message);
    res.status(503).json({
      success: false,
      message: 'Database service unavailable. Please contact the administrator.',
    });
  }
});

// 7. Route Mounting
const leadRoutes = require('./routes/leadRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const authRoutes = require('./routes/authRoutes');
const linkedinRoutes = require('./routes/linkedinRoutes');

app.use(['/_/backend/api/auth', '/api/auth'], authRoutes);
app.use(['/_/backend/api/leads', '/api/leads'], protect, leadRoutes);
app.use(['/_/backend/api/settings', '/api/settings'], protect, settingsRoutes);
app.use(['/_/backend/api/linkedin', '/api/linkedin'], protect, linkedinRoutes);

// 8. Fail-Secure Global Error Handler (CWE-209: Never leak stack traces to client in production)
app.use((err, req, res, next) => {
  console.error('[SERVER-EXCEPTION]', err);
  const isDev = process.env.NODE_ENV !== 'production';

  res.status(err.status || 500).json({
    success: false,
    message: isDev ? err.message : 'An unexpected server error occurred.',
    ...(isDev && { stack: err.stack }),
  });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`[SECURE SERVER] Running on port ${PORT}`);
  });
}

module.exports = app;
