/**
 * @file rateLimiters.js
 * @layer Middleware Layer / Anti-Scraping & Brute Force Protection
 * @description Sliding window rate limiters with fail-secure audit event generation.
 *
 * Mitigates:
 * - OWASP A07:2021 (Identification and Authentication Failures - Credential Stuffing & Brute Force)
 * - CWE-307 (Improper Restriction of Excessive Authentication Attempts)
 * - CWE-799 (Improper Control of Generation of Code or Resource Consumption - Scraping)
 */

const rateLimit = require('express-rate-limit');
const { logAudit } = require('../services/auditLogger');

/**
 * Helper to build custom rate limit handlers that log audit events when breached.
 */
function createRateLimitHandler(limitName, retryMinutes) {
  return (req, res, next, options) => {
    // Generate Security Audit Event
    logAudit({
      action: 'SECURITY_RATE_LIMIT_EXCEEDED',
      req,
      status: 'BLOCKED',
      details: {
        limit: limitName,
        ip: req.ip,
        method: req.method,
        path: req.originalUrl,
        retryAfterMinutes: retryMinutes,
      },
    });

    res.status(options.statusCode).json({
      success: false,
      message: `Too many requests for ${limitName}. Please try again in ${retryMinutes} minutes.`,
      retryAfterSeconds: Math.ceil(options.windowMs / 1000),
    });
  };
}

/**
 * Strict Rate Limiter for Authentication endpoints (Login & MFA).
 * Max 5 attempts per 15 minutes.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per window
  standardHeaders: true, // Return RateLimit-* headers (RFC draft-ietf-httpapi-ratelimit-headers)
  legacyHeaders: false,
  handler: createRateLimitHandler('Authentication', 15),
  skipSuccessfulRequests: false,
});

/**
 * Strict Anti-Scraping Rate Limiter for Lead Exports and Bulk Operations.
 * Max 3 requests per 15 minutes per user/IP.
 */
const exportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3, // Prevent bulk data exfiltration / scraping attacks
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('Lead Exporting', 15),
});

/**
 * General API Limiter protecting against DDoS and heavy scraping.
 * Max 120 requests per minute per IP.
 */
const generalApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: createRateLimitHandler('General API', 1),
});

module.exports = {
  authLimiter,
  exportLimiter,
  generalApiLimiter,
};
