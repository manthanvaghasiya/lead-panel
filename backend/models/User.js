/**
 * @file User.js
 * @layer Database Layer / Identity & Credential Management
 * @description Hardened User Schema supporting Multi-Factor Authentication (MFA),
 * Account Lockout (CWE-307), and Role-Based Access Control (RBAC).
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 100,
      index: true,
    },
    password: {
      type: String,
      required: true,
      select: true,
    },
    name: {
      type: String,
      default: 'User',
      trim: true,
      maxlength: 100,
    },
    role: {
      type: String,
      enum: ['admin', 'tech', 'marketing', 'agent'],
      required: true,
      default: 'tech',
      index: true,
    },
    // Multi-Factor Authentication (MFA)
    isMfaEnabled: {
      type: Boolean,
      default: false,
    },
    mfaSecret: {
      type: String, // Encrypted TOTP secret or base32
      select: false, // Never returned by default in queries (CWE-200)
    },
    mfaBackupCodes: {
      type: [String],
      select: false,
    },
    // Inactivity Session Timeout Tracking (NIST SP 800-63B)
    lastActive: {
      type: Date,
      default: Date.now,
    },
    // Brute-Force & Credential Stuffing Mitigation (Account Lockout)
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', userSchema);
