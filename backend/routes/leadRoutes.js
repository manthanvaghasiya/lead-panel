/**
 * @file leadRoutes.js
 * @layer Route & Controller Layer / Zero-Trust Lead Management
 * @description Enterprise-hardened Lead endpoints enforcing Zero-Trust RBAC, AES-256-GCM
 * PII encryption, Blind Index search, Anti-Scraping Rate Limiting, Input Validation, and Immutable Audit Logging.
 *
 * Mitigates:
 * - OWASP A01:2021 (Broken Access Control - Bypassing Department Isolation / Unauthorized Exports)
 * - OWASP A02:2021 (Cryptographic Failures - Exposure of Plaintext Leads at Rest)
 * - OWASP A03:2021 (Injection - NoSQL, Command, XSS)
 * - OWASP A09:2021 (Security Logging and Monitoring Failures)
 * - GDPR Art. 5 (Data Minimization) & Art. 32 (Security of Processing)
 */

const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const { callGeminiWithRetry } = require('../utils/geminiHelper');
const { generateBlindIndex, encryptPII } = require('../utils/cryptoVault');
const { authorizeRoles, getDepartmentFilter } = require('../middleware/authMiddleware');
const { exportLimiter } = require('../middleware/rateLimiters');
const { logAudit } = require('../services/auditLogger');
const {
  leadInputSchema,
  callLogSchema,
  noSqlSanitizerMiddleware,
  sanitizeOutput,
} = require('../validators/schemas');

// Apply NoSQL object injection sanitizer across all lead routes (CWE-943)
router.use(noSqlSanitizerMiddleware);

// =========================================================================
// 1. LEAD EXPORT (Zero-Trust RBAC + Anti-Scraping Rate Limiting)
// =========================================================================

/**
 * Lead Export Endpoint
 * Strictly restricted to 'admin' role. Protected by sliding window rate limiter
 * to mitigate automated scrapers and large-scale insider exfiltration.
 */
router.get('/export', exportLimiter, authorizeRoles('admin'), async (req, res) => {
  try {
    const leads = await Lead.find({}).sort({ createdAt: -1 });

    const decryptedLeads = leads.map(l => l.formatForRole('admin'));

    // Immutable Audit Log for Data Loss Prevention (DLP)
    logAudit({
      action: 'LEAD_EXPORT',
      req,
      user: req.user,
      status: 'SUCCESS',
      details: { exportedRecordCount: decryptedLeads.length },
    });

    res.json(sanitizeOutput(decryptedLeads));
  } catch (err) {
    console.error('[LEAD-EXPORT] Error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to export lead dataset.' });
  }
});

// =========================================================================
// 2. LEAD READ OPERATIONS (Department Isolation & PII Masking)
// =========================================================================

/**
 * Get all leads
 * Enforces department isolation: Non-admin users only receive leads in their assigned department.
 * Dynamic PII masking applied for lower-privileged roles.
 */
router.get('/', async (req, res) => {
  try {
    const departmentFilter = getDepartmentFilter(req);
    const leads = await Lead.find(departmentFilter).sort({ updatedAt: -1 });

    // Format and dynamically mask PII based on requesting user's RBAC role
    const formattedLeads = leads.map(l => l.formatForRole(req.user?.role || 'agent'));

    // Non-blocking security audit log
    logAudit({
      action: 'LEAD_READ_ALL',
      req,
      user: req.user,
      status: 'SUCCESS',
      details: { recordCount: formattedLeads.length, appliedFilter: departmentFilter },
    });

    res.json(sanitizeOutput(formattedLeads));
  } catch (err) {
    console.error('[LEAD-READ] Error:', err.message);
    res.status(500).json({ message: 'Internal server error while fetching leads.' });
  }
});

/**
 * Get a single lead by ID
 * Parameterized lookup preventing unauthorized horizontal privilege escalation (IDOR).
 */
router.get('/:id', async (req, res) => {
  try {
    const departmentFilter = getDepartmentFilter(req);
    // Combine ID and department filter to prevent cross-tenant/cross-department IDOR (CWE-639)
    const query = { _id: req.params.id, ...departmentFilter };

    const lead = await Lead.findOne(query);
    if (!lead) {
      logAudit({
        action: 'LEAD_READ_SINGLE',
        req,
        user: req.user,
        resourceId: req.params.id,
        status: 'BLOCKED',
        details: { reason: 'Lead not found or unauthorized department access' },
      });
      return res.status(404).json({ message: 'Lead not found or access restricted.' });
    }

    const formattedLead = lead.formatForRole(req.user?.role || 'agent');

    logAudit({
      action: 'LEAD_READ_SINGLE',
      req,
      user: req.user,
      resourceId: req.params.id,
      status: 'SUCCESS',
    });

    res.json(sanitizeOutput(formattedLead));
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving lead.' });
  }
});

// =========================================================================
// 3. LEAD CREATION & UPDATE (Zod Validation & PII Encryption)
// =========================================================================

/**
 * Create a new lead
 * Validates payload with Zod, calculates blind index, encrypts PII at rest.
 */
router.post('/', async (req, res) => {
  // Validate incoming payload with strict length bounds
  const validation = leadInputSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      message: 'Validation failed: ' + validation.error.errors.map(e => e.message).join(', '),
    });
  }

  const validData = validation.data;

  try {
    // Clean and normalize mobile number
    let mobileClean = validData.mobile.replace(/\D/g, '');
    if (mobileClean.startsWith('91') && mobileClean.length === 12) {
      mobileClean = mobileClean.substring(2);
    }
    if (mobileClean.startsWith('0')) {
      mobileClean = mobileClean.substring(1);
    }

    // Check duplicates securely using the deterministic Blind Index (no plaintext leakage)
    const mobileBlindIndex = generateBlindIndex(mobileClean);
    const existing = await Lead.findOne({ mobileBlindIndex });
    if (existing) {
      return res.status(400).json({
        message: `A lead with this mobile number already exists in the system.`,
      });
    }

    // Determine assigned department based on RBAC
    const assignedDepartment =
      req.user.role === 'admin' && validData.department ? validData.department : req.user.role || 'tech';

    const lead = new Lead({
      ...validData,
      mobile: mobileClean,
      department: assignedDepartment,
    });

    const newLead = await lead.save();

    logAudit({
      action: 'LEAD_CREATE',
      req,
      user: req.user,
      resourceId: newLead._id,
      status: 'SUCCESS',
      details: { leadName: newLead.name, department: assignedDepartment },
    });

    res.status(201).json(sanitizeOutput(newLead.formatForRole(req.user.role)));
  } catch (err) {
    console.error('[LEAD-CREATE] Error:', err.message);
    res.status(400).json({ message: err.message });
  }
});

/**
 * Update a lead (General Info)
 */
router.patch('/:id', async (req, res) => {
  // Validate partial update payload
  const validation = leadInputSchema.partial().safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      message: 'Validation failed: ' + validation.error.errors.map(e => e.message).join(', '),
    });
  }

  try {
    const departmentFilter = getDepartmentFilter(req);
    const lead = await Lead.findOne({ _id: req.params.id, ...departmentFilter });
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found or unauthorized.' });
    }

    const updates = validation.data;

    // If mobile number is being updated, verify uniqueness via Blind Index
    if (updates.mobile) {
      let mobileClean = updates.mobile.replace(/\D/g, '');
      if (mobileClean.startsWith('91') && mobileClean.length === 12) mobileClean = mobileClean.substring(2);
      if (mobileClean.startsWith('0')) mobileClean = mobileClean.substring(1);

      const blindIndex = generateBlindIndex(mobileClean);
      const duplicate = await Lead.findOne({ mobileBlindIndex: blindIndex, _id: { $ne: req.params.id } });
      if (duplicate) {
        return res.status(400).json({ message: 'Another lead already exists with this mobile number.' });
      }

      lead.mobile = mobileClean;
    }

    // Apply other safe fields
    Object.keys(updates).forEach(key => {
      if (key !== 'mobile' && key !== '_id' && key !== 'department') {
        lead[key] = updates[key];
      }
    });

    // Admins can reassign departments
    if (req.user.role === 'admin' && updates.department) {
      lead.department = updates.department;
    }

    const updatedLead = await lead.save();

    logAudit({
      action: 'LEAD_UPDATE',
      req,
      user: req.user,
      resourceId: lead._id,
      status: 'SUCCESS',
      details: { updatedFields: Object.keys(updates) },
    });

    res.json(sanitizeOutput(updatedLead.formatForRole(req.user.role)));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/**
 * Delete a lead
 * Strict RBAC: Only 'admin' or department managers can permanently delete leads.
 */
router.delete('/:id', authorizeRoles('admin', 'tech', 'marketing'), async (req, res) => {
  try {
    const departmentFilter = getDepartmentFilter(req);
    const lead = await Lead.findOneAndDelete({ _id: req.params.id, ...departmentFilter });
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found or unauthorized.' });
    }

    logAudit({
      action: 'LEAD_DELETE',
      req,
      user: req.user,
      resourceId: req.params.id,
      status: 'SUCCESS',
      details: { leadName: lead.name },
    });

    res.json({ message: 'Lead successfully deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error while deleting lead.' });
  }
});

// =========================================================================
// 4. BULK IMPORT (Encrypted Ingestion & De-duplication)
// =========================================================================

router.post('/bulk-import', async (req, res) => {
  try {
    const leads = req.body;
    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ message: 'Payload must be a non-empty array of leads.' });
    }

    if (leads.length > 1000) {
      return res.status(400).json({ message: 'Bulk import exceeds maximum allowed threshold of 1000 rows.' });
    }

    const validLeads = leads.filter(l => l.name && l.mobile);
    const incomingBlindIndexes = [];
    const sanitizedIncoming = [];

    for (const lead of validLeads) {
      let cleanMobile = lead.mobile.toString().replace(/\D/g, '');
      if (cleanMobile.startsWith('91') && cleanMobile.length === 12) cleanMobile = cleanMobile.substring(2);
      if (cleanMobile.startsWith('0')) cleanMobile = cleanMobile.substring(1);
      cleanMobile = cleanMobile || '0000000000';

      const blindIndex = generateBlindIndex(cleanMobile);
      incomingBlindIndexes.push(blindIndex);

      sanitizedIncoming.push({
        name: String(lead.name).substring(0, 100),
        mobile: cleanMobile,
        mobileBlindIndex: blindIndex,
        source: lead.source ? String(lead.source).substring(0, 60) : 'Website',
        department: req.user?.role === 'admin' ? lead.department || 'tech' : req.user.role || 'tech',
        type: ['Hot', 'Warm', 'Cold', 'Won', 'Lost'].includes(lead.type) ? lead.type : 'Cold',
        status: lead.status ? String(lead.status).substring(0, 60) : 'Pending',
        businessType: lead.businessType ? String(lead.businessType).substring(0, 100) : '',
        city: lead.city ? String(lead.city).substring(0, 100) : '',
        address: lead.address ? String(lead.address).substring(0, 300) : '',
        mapsUrl: lead.mapsUrl ? String(lead.mapsUrl).substring(0, 500) : '',
      });
    }

    // Find existing leads using the blind index
    const existingLeads = await Lead.find({ mobileBlindIndex: { $in: incomingBlindIndexes } }).select('mobileBlindIndex');
    const existingSet = new Set(existingLeads.map(l => l.mobileBlindIndex));

    const toInsert = [];
    const seenBatch = new Set();

    for (const item of sanitizedIncoming) {
      if (!existingSet.has(item.mobileBlindIndex) && !seenBatch.has(item.mobileBlindIndex)) {
        seenBatch.add(item.mobileBlindIndex);
        // Encrypt mobile before saving
        item.mobile = encryptPII(item.mobile);
        toInsert.push(item);
      }
    }

    let importedCount = 0;
    if (toInsert.length > 0) {
      const result = await Lead.insertMany(toInsert);
      importedCount = result.length;
    }

    logAudit({
      action: 'LEAD_BULK_IMPORT',
      req,
      user: req.user,
      status: 'SUCCESS',
      details: { attemptedCount: leads.length, importedCount, skippedCount: leads.length - importedCount },
    });

    res.json({
      imported: importedCount,
      skipped: leads.length - importedCount,
    });
  } catch (err) {
    console.error('[LEAD-BULK-IMPORT] Error:', err.message);
    res.status(500).json({ message: 'Failed to process bulk import.' });
  }
});

// =========================================================================
// 5. CALL LOGS & AI HELPERS
// =========================================================================

router.post('/:id/call-logs', async (req, res) => {
  const validation = callLogSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ message: validation.error.errors.map(e => e.message).join(', ') });
  }

  try {
    const departmentFilter = getDepartmentFilter(req);
    const lead = await Lead.findOne({ _id: req.params.id, ...departmentFilter });
    if (!lead) return res.status(404).json({ message: 'Lead not found or unauthorized.' });

    lead.callLogs.push(validation.data);

    if (validation.data.typeAtTime) lead.type = validation.data.typeAtTime;
    if (validation.data.statusAtTime) lead.status = validation.data.statusAtTime;

    if (validation.data.nextFollowup) {
      lead.followupDate = validation.data.nextFollowup;
      lead.lastFollowupCompletedDate = null;
    } else {
      lead.followupDate = null;
      lead.lastFollowupCompletedDate = new Date();
    }

    const updatedLead = await lead.save();

    logAudit({
      action: 'LEAD_UPDATE',
      req,
      user: req.user,
      resourceId: lead._id,
      status: 'SUCCESS',
      details: { callLogAdded: true, outcome: validation.data.outcome },
    });

    res.json(sanitizeOutput(updatedLead.formatForRole(req.user.role)));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id/call-logs/:logId', async (req, res) => {
  try {
    const departmentFilter = getDepartmentFilter(req);
    const lead = await Lead.findOne({ _id: req.params.id, ...departmentFilter });
    if (!lead) return res.status(404).json({ message: 'Lead not found or access denied.' });

    const log = lead.callLogs.id(req.params.logId);
    if (!log) return res.status(404).json({ message: 'Call log not found.' });

    const { note, typeAtTime, statusAtTime, nextFollowup, outcome } = req.body;
    if (note !== undefined) log.note = String(note).substring(0, 1000);
    if (typeAtTime !== undefined) log.typeAtTime = typeAtTime;
    if (statusAtTime !== undefined) log.statusAtTime = statusAtTime;
    if (nextFollowup !== undefined) log.nextFollowup = nextFollowup;
    if (outcome !== undefined) log.outcome = String(outcome).substring(0, 200);

    const updatedLead = await lead.save();
    res.json(sanitizeOutput(updatedLead.formatForRole(req.user.role)));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id/call-logs/:logId', async (req, res) => {
  try {
    const departmentFilter = getDepartmentFilter(req);
    const lead = await Lead.findOne({ _id: req.params.id, ...departmentFilter });
    if (!lead) return res.status(404).json({ message: 'Lead not found or access denied.' });

    lead.callLogs.pull(req.params.logId);
    const updatedLead = await lead.save();
    res.json(sanitizeOutput(updatedLead.formatForRole(req.user.role)));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// AI Insights
router.get('/:id/ai-insight', async (req, res) => {
  try {
    const departmentFilter = getDepartmentFilter(req);
    const lead = await Lead.findOne({ _id: req.params.id, ...departmentFilter });
    if (!lead) return res.status(404).json({ message: 'Lead not found or access denied.' });

    const formattedLogs = lead.callLogs
      .map(log => `Date: ${new Date(log.date).toLocaleDateString()}, Status: ${log.statusAtTime}, Note: ${log.note}`)
      .join('\n');

    const result = await callGeminiWithRetry(async genAI => {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prompt = `
        You are an expert sales assistant. Analyze the lead:
        Lead Name: ${lead.name}
        Business Type: ${lead.businessType}
        Status: ${lead.status}
        Follow-up History:
        ${formattedLogs}

        Provide your response as a valid JSON object with: "summary", "nextAction", "draftMessage".
      `;
      return await model.generateContent(prompt);
    });

    let responseText = result.response.text().trim();
    if (responseText.startsWith('\`\`\`json')) {
      responseText = responseText.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
    } else if (responseText.startsWith('\`\`\`')) {
      responseText = responseText.replace(/^\`\`\`/, '').replace(/\`\`\`$/, '').trim();
    }

    const insight = JSON.parse(responseText);
    res.json(sanitizeOutput(insight));
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate AI insight.' });
  }
});

// AI Extract routes
router.post('/ai-extract', async (req, res) => {
  try {
    const { text, imageBase64, mimeType } = req.body;
    if (!text && !imageBase64) return res.status(400).json({ message: 'Text or image input is required' });

    const result = await callGeminiWithRetry(async genAI => {
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: { responseMimeType: 'application/json' },
      });

      const prompt = `Extract structured lead JSON ("name", "ownerName", "mobile", "address", "city", "businessType", "website", "type", "source", "status", "socials") from: "${text || ''}"`;
      const parts = [prompt];
      if (imageBase64 && mimeType) {
        parts.push({ inlineData: { data: imageBase64, mimeType } });
      }
      return await model.generateContent(parts);
    });

    const responseText = result.response.text().trim();
    res.json(sanitizeOutput(JSON.parse(responseText)));
  } catch (err) {
    res.status(500).json({ message: 'AI Extraction failed.' });
  }
});

router.post('/ai-extract-log', async (req, res) => {
  try {
    const { text, imageBase64, mimeType } = req.body;
    if (!text && !imageBase64) return res.status(400).json({ message: 'Text or image input is required' });

    const result = await callGeminiWithRetry(async genAI => {
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: { responseMimeType: 'application/json' },
      });
      const prompt = `Extract call log JSON ("note", "typeAtTime", "statusAtTime", "nextFollowup", "outcome") from notes: "${text || ''}"`;
      const parts = [prompt];
      if (imageBase64 && mimeType) parts.push({ inlineData: { data: imageBase64, mimeType } });
      return await model.generateContent(parts);
    });

    const responseText = result.response.text().trim();
    res.json(sanitizeOutput(JSON.parse(responseText)));
  } catch (err) {
    res.status(500).json({ message: 'AI Call Log extraction failed.' });
  }
});

module.exports = router;
