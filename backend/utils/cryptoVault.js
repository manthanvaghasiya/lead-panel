/**
 * @file cryptoVault.js
 * @layer Database Layer / Security Primitives
 * @description Advanced Cryptographic Vault implementing NIST SP 800-38D AES-256-GCM
 * encryption at rest for sensitive PII (emails, phone numbers) and GDPR/CCPA data minimization masking.
 *
 * Mitigates:
 * - OWASP A02:2021 (Cryptographic Failures)
 * - CWE-311 (Missing Encryption of Sensitive Data at Rest)
 * - CWE-327 (Use of a Broken or Risky Cryptographic Algorithm)
 * - GDPR Art. 32 (Security of Processing - Pseudonymization & Cryptographic Controls)
 */

const crypto = require('crypto');

// Master Encryption Key (32 bytes / 256 bits). In production, load from KMS / HSM / Secret Vault.
const MASTER_KEY_RAW = process.env.PII_ENCRYPTION_KEY || 'webiox_enterprise_pii_master_key_2026_aes256_gcm_32b!';
// Deterministic salt for search indexing (Blind Indexing)
const BLIND_INDEX_SALT = process.env.PII_BLIND_INDEX_SALT || 'webiox_blind_index_salt_secure_hmac_2026!';

// Ensure exactly 32 bytes for AES-256
const ENCRYPTION_KEY = crypto.createHash('sha256').update(MASTER_KEY_RAW).digest();
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended by NIST SP 800-38D for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag for integrity verification

/**
 * Encrypts sensitive plaintext using authenticated AES-256-GCM.
 * Prevents tampering, bit-flipping, and ciphertext manipulation.
 *
 * @param {string} plaintext - The unencrypted sensitive data (e.g. mobile number, email)
 * @returns {string|null} Serialized base64 payload: iv.authTag.ciphertext
 */
function encryptPII(plaintext) {
  if (!plaintext || typeof plaintext !== 'string') {
    return plaintext;
  }

  try {
    // Generate a cryptographically secure random 96-bit Initialization Vector per operation
    // Mitigates CWE-329 (Not Using a Random IV with CBC or GCM Mode)
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:ciphertext (all in hex for safe DB storage)
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (err) {
    console.error('[CryptoVault] Encryption failed:', err.message);
    throw new Error('PII Encryption failure');
  }
}

/**
 * Decrypts authenticated AES-256-GCM payload and verifies authentication tag.
 * If the ciphertext or tag has been tampered with, authentication fails.
 *
 * @param {string} ciphertextPayload - Formatted as iv:authTag:ciphertext
 * @returns {string} Decrypted plaintext
 */
function decryptPII(ciphertextPayload) {
  if (!ciphertextPayload || typeof ciphertextPayload !== 'string') {
    return ciphertextPayload;
  }

  // Check if string is in iv:authTag:ciphertext format
  const parts = ciphertextPayload.split(':');
  if (parts.length !== 3) {
    // If not encrypted (legacy or unmigrated record), return as-is for backward compatibility
    return ciphertextPayload;
  }

  try {
    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    // Failure here implies ciphertext tampering or corrupted cryptographic key
    // Mitigates CWE-354 (Improper Validation of Integrity Check Value)
    console.error('[CryptoVault] Integrity check failed during decryption:', err.message);
    return '[ENCRYPTED_DATA_INTEGRITY_FAIL]';
  }
}

/**
 * Generates a deterministic Blind Index (HMAC-SHA256) for exact-match searches
 * on encrypted fields (e.g. mobile lookup) without exposing plaintext or requiring
 * deterministic encryption (which would leak equality across the whole dataset).
 *
 * @param {string} plaintext - Value to generate blind index for (normalized)
 * @returns {string} Hex-encoded HMAC hash
 */
function generateBlindIndex(plaintext) {
  if (!plaintext || typeof plaintext !== 'string') return '';
  const normalized = plaintext.trim().toLowerCase();
  return crypto.createHmac('sha256', BLIND_INDEX_SALT).update(normalized).digest('hex');
}

/**
 * GDPR / CCPA Data Minimization & Masking
 * Masks sensitive phone numbers for lower-privileged roles (e.g. Agents).
 * Example: "9876543210" -> "******3210"
 *
 * @param {string} phone - Raw or decrypted phone number
 * @returns {string} Masked phone number
 */
function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  const clean = phone.replace(/\D/g, '');
  if (clean.length <= 4) return '****';
  return '*'.repeat(clean.length - 4) + clean.slice(-4);
}

/**
 * GDPR / CCPA Data Minimization & Masking
 * Masks sensitive emails for lower-privileged roles.
 * Example: "alex.smith@company.com" -> "a***h@company.com"
 *
 * @param {string} email - Raw or decrypted email address
 * @returns {string} Masked email
 */
function maskEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) return '***@***';
  const [user, domain] = email.split('@');
  if (user.length <= 2) {
    return `${user[0]}***@${domain}`;
  }
  return `${user[0]}***${user[user.length - 1]}@${domain}`;
}

module.exports = {
  encryptPII,
  decryptPII,
  generateBlindIndex,
  maskPhone,
  maskEmail,
};
