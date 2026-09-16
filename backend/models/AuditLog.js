/**
 * @file AuditLog.js
 * @layer Database Layer / Compliance & Forensics
 * @description Immutable Audit Log Schema adhering to NIST SP 800-92 (Guide to Computer Security Log Management)
 * and SOC 2 / GDPR accountability requirements.
 *
 * Mitigates:
 * - OWASP A09:2021 (Security Logging and Monitoring Failures)
 * - CWE-778 (Insufficient Logging)
 * - CWE-284 (Improper Access Control / Log Tampering)
 */

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
      immutable: true, // NIST requirement: timestamps cannot be retroactively altered
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      immutable: true,
    },
    userEmail: {
      type: String,
      immutable: true,
    },
    userRole: {
      type: String,
      immutable: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'AUTH_LOGIN_SUCCESS',
        'AUTH_LOGIN_FAILED',
        'AUTH_MFA_CHALLENGE',
        'AUTH_MFA_SUCCESS',
        'AUTH_MFA_FAILED',
        'AUTH_LOGOUT',
        'LEAD_READ_ALL',
        'LEAD_READ_SINGLE',
        'LEAD_CREATE',
        'LEAD_UPDATE',
        'LEAD_DELETE',
        'LEAD_EXPORT',
        'LEAD_BULK_IMPORT',
        'SECURITY_RATE_LIMIT_EXCEEDED',
        'SECURITY_CSRF_REJECTED',
        'SECURITY_UNAUTHORIZED_ACCESS_ATTEMPT',
      ],
      index: true,
      immutable: true,
    },
    resourceType: {
      type: String,
      default: 'LEAD',
      immutable: true,
    },
    resourceId: {
      type: String,
      index: true,
      immutable: true,
    },
    // GDPR Art. 4 Compliance: IP addresses are PII, store pseudonymized one-way cryptographic hash
    ipHash: {
      type: String,
      required: true,
      immutable: true,
    },
    userAgent: {
      type: String,
      immutable: true,
      maxlength: 256,
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILURE', 'WARNING', 'BLOCKED'],
      default: 'SUCCESS',
      immutable: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      immutable: true,
    },
  },
  {
    timestamps: false, // Custom immutable timestamp is used
    versionKey: false,
  }
);

// Enforce Strict Immutability: Disallow updates and deletes on the AuditLog collection
auditLogSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne'], function (next) {
  next(new Error('[SECURITY VIOLATION] Audit Logs are strictly immutable and cannot be updated.'));
});

auditLogSchema.pre(['deleteOne', 'deleteMany', 'findOneAndDelete', 'findOneAndRemove'], function (next) {
  next(new Error('[SECURITY VIOLATION] Audit Logs are strictly immutable and cannot be deleted.'));
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
