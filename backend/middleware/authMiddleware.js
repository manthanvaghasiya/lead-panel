/**
 * @file authMiddleware.js
 * @layer Middleware Layer / Zero-Trust Authentication & RBAC
 * @description Hardened Session Verification with HttpOnly Cookies, 15-Minute Inactivity Timeouts,
 * and Zero-Trust Role-Based Access Control (RBAC).
 *
 * Mitigates:
 * - OWASP A01:2021 (Broken Access Control)
 * - OWASP A07:2021 (Identification & Authentication Failures - Token Theft via XSS, Session Hijacking)
 * - CWE-1004 (Sensitive Cookie Without 'HttpOnly' Flag)
 * - CWE-613 (Insufficient Session Expiration)
 * - CWE-285 (Improper Authorization)
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logAudit } = require('../services/auditLogger');

const JWT_SECRET = process.env.JWT_SECRET || 'webiox_enterprise_super_secret_key_2026_jwt_protect!';
const SESSION_INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 Minutes Inactivity Timeout (NIST SP 800-63B)

/**
 * Protect Middleware:
 * Extracts JWT securely from HTTP-only Cookie (preferred) or Authorization Header.
 * Verifies validity, user existence, and inactivity timeouts.
 */
const protect = async (req, res, next) => {
  let token;

  // 1. Primary Vector: HttpOnly Secure Cookie (mitigates XSS token extraction)
  if (req.cookies && req.cookies.session_token) {
    token = req.cookies.session_token;
  }
  // 2. Secondary Vector: Bearer Header (for native API clients and backwards compatibility)
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied: No authentication token provided.',
    });
  }

  try {
    // Cryptographically verify token signature
    const decoded = jwt.verify(token, JWT_SECRET);

    // Retrieve active user from DB to verify user is still valid and active
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      logAudit({
        action: 'SECURITY_UNAUTHORIZED_ACCESS_ATTEMPT',
        req,
        status: 'BLOCKED',
        details: { reason: 'User associated with token no longer exists', decodedId: decoded.id },
      });
      return res.status(401).json({ success: false, message: 'User account no longer exists.' });
    }

    // Enforce 15-Minute Session Inactivity Timeout (NIST 800-63B Section 7.2)
    const now = Date.now();
    const lastActive = user.lastActive ? new Date(user.lastActive).getTime() : now;

    if (now - lastActive > SESSION_INACTIVITY_LIMIT_MS) {
      // Clear session cookie upon inactivity expiry
      res.clearCookie('session_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });

      logAudit({
        action: 'AUTH_LOGOUT',
        req,
        user,
        status: 'SUCCESS',
        details: { reason: 'Session expired due to 15 minutes of inactivity' },
      });

      return res.status(401).json({
        success: false,
        message: 'Session expired due to inactivity. Please log in again.',
        sessionExpired: true,
      });
    }

    // Refresh lastActive timestamp asynchronously (Sliding Window Session)
    user.lastActive = new Date();
    await user.save({ validateBeforeSave: false });

    // Attach validated user context to request
    req.user = user;
    next();
  } catch (error) {
    logAudit({
      action: 'SECURITY_UNAUTHORIZED_ACCESS_ATTEMPT',
      req,
      status: 'BLOCKED',
      details: { error: error.message },
    });

    return res.status(401).json({
      success: false,
      message: 'Session token invalid or expired.',
    });
  }
};

/**
 * Zero-Trust Role-Based Access Control (RBAC) Middleware.
 * Enforces permissions strictly on the server regardless of client UI state.
 *
 * @param {...string} allowedRoles - Roles permitted to execute this route (e.g. 'admin', 'tech')
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ success: false, message: 'Forbidden: Missing role identity.' });
    }

    // Admin role has omni-privilege access
    if (req.user.role === 'admin' || allowedRoles.includes(req.user.role)) {
      return next();
    }

    // Log unauthorized escalation attempt
    logAudit({
      action: 'SECURITY_UNAUTHORIZED_ACCESS_ATTEMPT',
      req,
      user: req.user,
      status: 'BLOCKED',
      details: {
        attemptedPath: req.originalUrl,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
      },
    });

    return res.status(403).json({
      success: false,
      message: `Access denied: Role '${req.user.role}' is not authorized to perform this operation.`,
    });
  };
};

/**
 * Enforces Department / Ownership Isolation.
 * Users with role 'tech' or 'marketing' can ONLY query and modify leads in their own department.
 * Admins can access all departments.
 */
const getDepartmentFilter = (req) => {
  if (!req.user || req.user.role === 'admin') {
    return {}; // Full access
  }
  return { department: req.user.role };
};

module.exports = {
  protect,
  authorizeRoles,
  getDepartmentFilter,
  JWT_SECRET,
};
