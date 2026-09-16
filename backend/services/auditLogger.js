/**
 * @file auditLogger.js
 * @layer Service Layer / DevSecOps Auditing
 * @description Non-blocking, immutable audit logging service with GDPR-compliant IP pseudonymization.
 *
 * Mitigates:
 * - OWASP A09:2021 (Security Logging and Monitoring Failures)
 * - CWE-359 (Exposure of Private Personal Information via Log Files)
 */

const crypto = require('crypto');
const AuditLog = require('../models/AuditLog');

const IP_SALT = process.env.AUDIT_IP_SALT || 'webiox_audit_ip_pseudonymization_salt_2026!';

/**
 * Computes a GDPR-compliant salted hash of the client's IP address.
 *
 * @param {string} ip - Raw client IP address
 * @returns {string} SHA-256 salted hash
 */
function hashIP(ip) {
  if (!ip) return 'UNKNOWN_IP';
  return crypto.createHmac('sha256', IP_SALT).update(ip.trim()).digest('hex').substring(0, 32);
}

/**
 * Records an immutable security audit event asynchronously.
 * Never throws or disrupts user transactions if logging encounters a DB issue.
 *
 * @param {Object} params
 * @param {string} params.action - One of the AuditLog.action enum values
 * @param {Object} [params.req] - Express request object (extracts IP and User Agent)
 * @param {Object} [params.user] - Authenticated user context
 * @param {string} [params.resourceId] - ID of modified/accessed resource (e.g. Lead ID)
 * @param {string} [params.resourceType] - Type of resource (e.g. 'LEAD', 'AUTH')
 * @param {string} [params.status='SUCCESS'] - Status of action ('SUCCESS', 'FAILURE', etc.)
 * @param {Object} [params.details={}] - Contextual details (excluding sensitive credentials/passwords)
 */
async function logAudit({
  action,
  req,
  user,
  resourceId,
  resourceType = 'LEAD',
  status = 'SUCCESS',
  details = {},
}) {
  try {
    const rawIp = req?.headers['x-forwarded-for']?.split(',')[0] || req?.socket?.remoteAddress || req?.ip || '0.0.0.0';
    const userAgent = req?.headers['user-agent'] ? req.headers['user-agent'].substring(0, 256) : 'Unknown';
    const ipHash = hashIP(rawIp);

    const currentUser = user || req?.user;

    // Never log passwords, tokens, or plaintext secrets in audit details
    const sanitizedDetails = { ...details };
    delete sanitizedDetails.password;
    delete sanitizedDetails.token;
    delete sanitizedDetails.mfaSecret;
    delete sanitizedDetails.cookie;

    await AuditLog.create({
      userId: currentUser?._id || currentUser?.id,
      userEmail: currentUser?.email || 'unauthenticated',
      userRole: currentUser?.role || 'anonymous',
      action,
      resourceType,
      resourceId: resourceId ? String(resourceId) : undefined,
      ipHash,
      userAgent,
      status,
      details: sanitizedDetails,
    });
  } catch (err) {
    // Fail-safe: In case database audit write fails, log to stdout without leaking PII
    console.error(`[AUDIT-LOG-FAILSAFE] Failed to persist audit entry [${action}]:`, err.message);
  }
}

module.exports = {
  logAudit,
  hashIP,
};
