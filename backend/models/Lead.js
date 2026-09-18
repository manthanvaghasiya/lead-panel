/**
 * @file Lead.js
 * @layer Database Layer / PII Encryption & Data Minimization
 * @description Lead Schema incorporating AES-256-GCM encryption at rest for sensitive PII (mobile numbers,
 * private emails), blind indexes for encrypted search, and dynamic role-based data masking.
 *
 * Mitigates:
 * - OWASP A02:2021 (Cryptographic Failures)
 * - CWE-311 (Missing Encryption of Sensitive Data at Rest)
 * - GDPR Art. 5 (Data Minimization) & Art. 32 (Security of Processing)
 */

const mongoose = require('mongoose');
const { encryptPII, decryptPII, generateBlindIndex, maskPhone, maskEmail } = require('../utils/cryptoVault');

const callLogSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  note: { type: String, required: true, maxlength: 1000 },
  statusAtTime: { type: String, maxlength: 60 },
  typeAtTime: { type: String, enum: ['Hot', 'Warm', 'Cold', 'Won', 'Lost'] },
  nextFollowup: { type: Date },
  outcome: { type: String, maxlength: 200 }
});

const leadSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  ownerName: { type: String, trim: true, maxlength: 100 },
  // Stored as iv:authTag:ciphertext (AES-256-GCM encrypted)
  mobile: { type: String, required: true },
  // Deterministic blind index for querying mobile without decrypting all database rows
  mobileBlindIndex: { type: String, index: true },
  businessType: { type: String, trim: true, maxlength: 100 },
  city: { type: String, trim: true, maxlength: 100 },
  address: { type: String, trim: true, maxlength: 300 },
  mapsUrl: { type: String, trim: true, maxlength: 500 },
  website: { type: String, trim: true, maxlength: 300 },
  source: { type: String, default: 'Website', maxlength: 60 },
  department: { type: String, enum: ['tech', 'marketing'], required: true, index: true },
  type: { type: String, enum: ['Hot', 'Warm', 'Cold', 'Won', 'Lost'], default: 'Cold', index: true },
  status: { type: String, default: 'Pending', index: true },
  followupDate: { type: Date, index: true },
  lastFollowupCompletedDate: { type: Date },
  callLogs: [callLogSchema],
  tags: [{ type: String, maxlength: 40 }],
  socials: {
    instagram: { type: String, maxlength: 300 },
    facebook: { type: String, maxlength: 300 },
    youtube: { type: String, maxlength: 300 },
    linkedin: { type: String, maxlength: 300 },
    rating: { type: String, maxlength: 20 },
    reviews: { type: String, maxlength: 20 },
    summary: { type: String, maxlength: 1000 },
    hours: { type: String, maxlength: 200 },
    emails: { type: String, maxlength: 500 },
    phones: { type: String, maxlength: 500 },
    addressMatch: { type: String, maxlength: 300 },
    instagramFollowers: { type: String, maxlength: 50 },
    facebookFollowers: { type: String, maxlength: 50 },
    youtubeSubscribers: { type: String, maxlength: 50 },
    platforms: [{
      name: { type: String, maxlength: 100 },
      rating: { type: String, maxlength: 20 },
      reviews: { type: String, maxlength: 20 },
      url: { type: String, maxlength: 500 }
    }]
  }
}, {
  timestamps: true
});

/**
 * Pre-save lifecycle hook:
 * Automatically encrypts plaintext mobile numbers into AES-256-GCM ciphertexts
 * and computes the deterministic Blind Index for searchability.
 */
leadSchema.pre('save', function (next) {
  if (this.isModified('mobile')) {
    // Generate blind index before encrypting
    this.mobileBlindIndex = generateBlindIndex(this.mobile);
    // Encrypt if not already encrypted
    if (!this.mobile.includes(':')) {
      this.mobile = encryptPII(this.mobile);
    }
  }

  // Encrypt private emails in socials if present
  if (this.socials?.emails && !this.socials.emails.includes(':')) {
    this.socials.emails = encryptPII(this.socials.emails);
  }

  if (typeof next === 'function') {
    next();
  }
});

/**
 * Decrypts and dynamically masks PII fields based on requesting user's RBAC role.
 * - 'admin', 'tech', 'marketing': Full access to decrypted contact details.
 * - 'agent' / lower-privileged: Data minimization / masked telephone & email.
 *
 * @param {string} userRole - 'admin' | 'tech' | 'marketing' | 'agent'
 * @returns {Object} Cleaned lead representation
 */
leadSchema.methods.formatForRole = function (userRole) {
  const leadObj = this.toObject();

  // Decrypt mobile
  const decryptedMobile = decryptPII(leadObj.mobile);

  // Decrypt emails in socials if present
  let decryptedEmails = leadObj.socials?.emails ? decryptPII(leadObj.socials.emails) : '';

  if (userRole === 'agent') {
    // Apply GDPR Data Minimization: Mask sensitive PII for agents
    leadObj.mobile = maskPhone(decryptedMobile);
    if (leadObj.socials) {
      leadObj.socials.emails = maskEmail(decryptedEmails);
      leadObj.socials.phones = maskPhone(leadObj.socials.phones);
    }
  } else {
    // Full authorized access for department heads and administrators
    leadObj.mobile = decryptedMobile;
    if (leadObj.socials) {
      leadObj.socials.emails = decryptedEmails;
    }
  }

  // Never expose internal cryptographic search hash to the client
  delete leadObj.mobileBlindIndex;

  return leadObj;
};

module.exports = mongoose.model('Lead', leadSchema);
