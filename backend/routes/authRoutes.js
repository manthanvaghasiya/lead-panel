/**
 * @file authRoutes.js
 * @layer Route Layer / Authentication Endpoints
 * @description Hardened Authentication Routes with rate limiting and session lifecycle management.
 */

const express = require('express');
const router = express.Router();
const { login, verifyMfa, refreshToken, logout, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiters');

// Apply Brute-Force Rate Limiting exclusively to credential submission routes
router.post('/login', authLimiter, login);
router.post('/mfa-verify', authLimiter, verifyMfa);

// Session Lifecycle
router.post('/refresh', protect, refreshToken);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

module.exports = router;
