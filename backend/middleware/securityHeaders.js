/**
 * @file securityHeaders.js
 * @layer Middleware Layer / Edge Hardening & Transport Security
 * @description Implements enterprise-grade HTTP security headers via Helmet and strict CORS controls.
 *
 * Mitigates:
 * - OWASP A05:2021 (Security Misconfiguration)
 * - CWE-1021 (Improper Restriction of Rendered UI Layers or Frames - Clickjacking)
 * - CWE-346 (Origin Validation Error / Permissive CORS)
 * - CWE-693 (Protection Mechanism Failure)
 */

const helmet = require('helmet');
const cors = require('cors');

// Whitelisted CORS domains
const ALLOWED_ORIGINS = [
  'https://leads.webiox.tech',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000',
];

/**
 * Validates whether the incoming Origin header is an approved domain or preview deployment.
 */
function isOriginAllowed(origin) {
  if (!origin) return true; // Allow non-browser requests (e.g. mobile native or server-to-server)
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Allow official Vercel preview deployments for this project
  if (/^https:\/\/lead-panel-[a-z0-9-]+-manthanvaghasiyas-projects\.vercel\.app$/.test(origin)) return true;
  if (/^https:\/\/.*\.webiox\.tech$/.test(origin)) return true;
  return false;
}

/**
 * Strict CORS Middleware enforcing credentials and whitelisted origins only.
 */
const configuredCors = cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      console.warn(`[SECURITY - CORS REJECTED] Blocked unauthorized origin: ${origin}`);
      callback(new Error('Blocked by CORS policy: Origin not allowed.'));
    }
  },
  credentials: true, // Required for HttpOnly SameSite cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400, // Preflight cache 24 hours
});

/**
 * Helmet Security Headers Middleware
 * Configures Content-Security-Policy, HSTS, X-Frame-Options, and nosniff.
 */
const configuredHelmet = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline scoped if needed for Vite scripts
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      connectSrc: [
        "'self'",
        'https://leads.webiox.tech',
        'https://*.vercel.app',
        'http://localhost:5000',
        'http://localhost:5173',
      ],
      frameAncestors: ["'none'"], // Complete Clickjacking protection (NIST guideline)
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  frameguard: { action: 'deny' }, // X-Frame-Options: DENY
  hsts: {
    maxAge: 31536000, // 1 Year HSTS (RFC 6797)
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true, // X-Content-Type-Options: nosniff
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
});

module.exports = {
  configuredCors,
  configuredHelmet,
};
