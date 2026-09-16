/**
 * @file schemas.js
 * @layer Validation Layer / Anti-Injection & Sanitization
 * @description Enterprise-grade input validation via Zod with explicit length limits,
 * strict NoSQL injection sanitization, and output HTML encoding.
 *
 * Mitigates:
 * - OWASP A03:2021 (Injection - NoSQL, Command, Buffer Overflows)
 * - OWASP A07:2021 (Identification and Authentication Failures)
 * - CWE-79 (Cross-Site Scripting - Stored & Reflected)
 * - CWE-943 (Improper Neutralization of Special Elements used in an SQL/NoSQL Command)
 */

const { z } = require('zod');

// ==========================================
// 1. Zod Input Validation Schemas
// ==========================================

/**
 * Authentication Login Schema with strict boundary checks
 */
const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(5, 'Email is too short')
    .max(100, 'Email must not exceed 100 characters')
    .email('Invalid email address format'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password must not exceed 128 characters'),
  mfaCode: z
    .string()
    .trim()
    .length(6, 'MFA code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'MFA code must contain only numbers')
    .optional(),
}).strict(); // Disallows unexpected fields (prevents Prototype Pollution)

/**
 * MFA Verification Schema
 */
const mfaVerifySchema = z.object({
  tempToken: z.string().min(10).max(512),
  code: z
    .string()
    .trim()
    .length(6, 'Verification code must be 6 digits')
    .regex(/^\d{6}$/, 'MFA code must be numeric'),
}).strict();

/**
 * Lead Creation & Update Schema with strict length constraints to prevent resource exhaustion
 */
const leadInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Lead name is required')
    .max(100, 'Name must not exceed 100 characters'),
  ownerName: z.string().trim().max(100).optional().nullable(),
  mobile: z
    .string()
    .trim()
    .min(5, 'Mobile number must be at least 5 digits')
    .max(25, 'Mobile number must not exceed 25 characters')
    .regex(/^[\d\s+\-().]+$/, 'Mobile number contains invalid characters'),
  businessType: z.string().trim().max(100).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
  mapsUrl: z.string().trim().max(500).url('Invalid maps URL').optional().nullable().or(z.literal('')),
  website: z.string().trim().max(300).optional().nullable(),
  source: z.string().trim().max(60).default('Website'),
  department: z.enum(['tech', 'marketing']).default('tech'),
  type: z.enum(['Hot', 'Warm', 'Cold', 'Won', 'Lost']).default('Cold'),
  status: z.string().trim().max(60).default('Pending'),
  followupDate: z.string().datetime().optional().nullable().or(z.literal('')).or(z.date()),
  tags: z.array(z.string().trim().max(40)).max(20).optional(),
}).strict();

/**
 * Call Log Schema
 */
const callLogSchema = z.object({
  note: z.string().trim().min(1, 'Call note is required').max(1000, 'Note must not exceed 1000 characters'),
  statusAtTime: z.string().trim().max(60).optional(),
  typeAtTime: z.enum(['Hot', 'Warm', 'Cold', 'Won', 'Lost']).optional(),
  nextFollowup: z.string().datetime().optional().nullable().or(z.literal('')).or(z.date()),
  outcome: z.string().trim().max(200).optional(),
}).strict();

// ==========================================
// 2. NoSQL Injection Sanitization
// ==========================================

/**
 * Deeply sanitizes an object to remove any MongoDB operators ($where, $gt, etc.)
 * or keys containing dot notation, mitigating NoSQL Object Injection (CWE-943).
 *
 * @param {*} data - User input to sanitize
 * @returns {*} Sanitized copy
 */
function sanitizeNoSQL(data) {
  if (data === null || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeNoSQL);
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    // Strip keys starting with '$' or containing '.'
    if (key.startsWith('$') || key.includes('.')) {
      console.warn(`[SECURITY] Blocked potential NoSQL injection key: "${key}"`);
      continue;
    }
    sanitized[key] = sanitizeNoSQL(value);
  }
  return sanitized;
}

/**
 * Express Middleware to sanitize req.body, req.query, and req.params against NoSQL injection.
 */
function noSqlSanitizerMiddleware(req, res, next) {
  if (req.body) req.body = sanitizeNoSQL(req.body);
  if (req.query) req.query = sanitizeNoSQL(req.query);
  if (req.params) req.params = sanitizeNoSQL(req.params);
  next();
}

// ==========================================
// 3. Output XSS Sanitization
// ==========================================

/**
 * Escapes dangerous HTML entities to prevent Stored & Reflected Cross-Site Scripting (CWE-79).
 *
 * @param {string} str - Raw string
 * @returns {string} Sanitized string with HTML entities escaped
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Recursively sanitizes string fields in an object before sending response to client.
 */
function sanitizeOutput(data) {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') return escapeHtml(data);
  if (Array.isArray(data)) return data.map(sanitizeOutput);
  if (typeof data === 'object' && !(data instanceof Date)) {
    // If it's a Mongoose document, convert to plain object
    const plain = typeof data.toObject === 'function' ? data.toObject() : { ...data };
    const result = {};
    for (const [key, val] of Object.entries(plain)) {
      result[key] = sanitizeOutput(val);
    }
    return result;
  }
  return data;
}

module.exports = {
  loginSchema,
  mfaVerifySchema,
  leadInputSchema,
  callLogSchema,
  sanitizeNoSQL,
  noSqlSanitizerMiddleware,
  escapeHtml,
  sanitizeOutput,
};
