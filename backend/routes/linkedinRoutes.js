const express = require('express');
const router = express.Router();
const LinkedInContact = require('../models/LinkedInContact');
const Lead = require('../models/Lead');
const { callGeminiWithRetry } = require('../utils/geminiHelper');

// Fallback Heuristic Parser for raw LinkedIn / WhatsApp pastes
function heuristicExtract(text) {
  const result = {
    name: '',
    position: '',
    company: '',
    location: '',
    reason: 'Freelance BDE Opportunity',
    linkedinUrl: '',
    mobile: '',
    email: '',
    status: 'In Conversation',
    priority: 'Warm',
    meetingLink: '',
    meetingTimeStr: '',
    commission: '',
    dealTerms: '',
    skills: [],
    notes: '',
    summary: ''
  };

  if (!text || typeof text !== 'string') return result;

  // Extract LinkedIn URL (prefer vanity / readable slug over raw ACoAA... URN)
  const allLinkedinUrls = [...text.matchAll(/https:\/\/(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_\-\%]+)/gi)];
  if (allLinkedinUrls.length > 0) {
    const vanityUrl = allLinkedinUrls.find(u => !u[1].startsWith('ACoAA'));
    result.linkedinUrl = vanityUrl ? vanityUrl[0] : allLinkedinUrls[0][0];
  }

  // Extract Google Meet / Zoom links
  const meetMatch = text.match(/https:\/\/meet\.google\.com\/[a-z0-9\-]+/i) || text.match(/https:\/\/[a-z0-9\.]*zoom\.us\/j\/[a-zA-Z0-9\?\=\_\-]+/i);
  if (meetMatch) {
    result.meetingLink = meetMatch[0];
    result.status = 'Meeting Scheduled';
  }

  // Extract Indian 10-digit mobile number or standard phone formats
  const phoneMatches = text.match(/(?:(?:\+91|91|0)?[ -]?)?([6-9]\d{9})\b/g);
  if (phoneMatches && phoneMatches.length > 0) {
    for (const pm of phoneMatches) {
      const cleanDigits = pm.replace(/\D/g, '').slice(-10);
      if (cleanDigits.length === 10) {
        result.mobile = cleanDigits;
        break;
      }
    }
  }

  // Extract Name
  const mdMatches = [...text.matchAll(/\[([A-Z][a-zA-Z\s\.\-]+)\]\((?:https:\/\/www\.linkedin\.com\/in\/[^)]+)\)/g)];
  const validNames = mdMatches
    .map(m => m[1].trim())
    .filter(n => 
      !n.toLowerCase().includes('status') && 
      !n.toLowerCase().includes('view') && 
      !n.toLowerCase().includes('manthan') && 
      !n.toLowerCase().includes('open to work') &&
      !n.toLowerCase().includes('contact') &&
      !n.toLowerCase().includes('experience') &&
      n.length > 2
    );

  if (validNames.length > 0) {
    result.name = validNames[0];
  } else {
    const sentMatch = text.match(/([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+sent the following message/i);
    if (sentMatch && !sentMatch[1].toLowerCase().includes('manthan')) {
      result.name = sentMatch[1].trim();
    }
  }

  // Extract Headline / Position
  const headlineMatch = text.match(/(Business Development[^\n\r]+|Software Engineer[^\n\r]+|Full Stack[^\n\r]+|Sales Executive[^\n\r]+|Manager[^\n\r]+|[A-Za-z\s]+(?:Executive|Specialist|Lead|Developer|Designer|Director)[^\n\r]+)/i);
  if (headlineMatch) {
    result.position = headlineMatch[0].trim().replace(/\s*·.*$/, '');
  }

  // Extract Company
  const companyMatch = text.match(/(?:work at|currently at|company|Experience\s*\[\s*[^\]]+)\s*([A-Za-z0-9\s]+(?:Solutions|Technologies|Pvt|Ltd|Tech|Digital|Studio|Media|Infotech))/i);
  if (companyMatch) {
    result.company = companyMatch[1].trim();
  } else if (text.includes('DI Solutions')) {
    result.company = 'DI Solutions';
  }

  // Extract Location
  const locMatch = text.match(/([A-Za-z\s]+,\s*(?:Gujarat|Maharashtra|Delhi|Karnataka|Tamil Nadu|Rajasthan|Uttar Pradesh|Punjab|India))/i);
  if (locMatch) {
    result.location = locMatch[1].trim();
  }

  // Extract Connection Reason
  if (/Active Partner|Closed \/ Partnered|Freelancer BDE\b/i.test(text)) {
    result.reason = 'Freelancer BDE';
  } else if (/Freelance BDE|Commission basis|BDE Opportunity/i.test(text)) {
    result.reason = 'Freelance BDE Opportunity';
  } else if (/Client|IT Services|Website development|App development|Project execution/i.test(text) && !/Freelance BDE/i.test(text)) {
    result.reason = 'IT Client / Project Lead';
  } else if (/Partnership|Collaboration|Subcontract/i.test(text)) {
    result.reason = 'Agency Partnership';
  } else if (/Resume|Hire|Job|Application/i.test(text)) {
    result.reason = 'Hiring / Candidate';
  }

  // Extract Commission and Deal Terms
  const commMatch = text.match(/(?:commission|payout|pay|earning)\D{0,20}(\d+(?:\.\d+)?%)/i) || text.match(/(\d+(?:\.\d+)?%)\s*(?:commission|payout|on\s+successfully|margin)/i) || text.match(/pay\s+(\d+(?:\.\d+)?%)/i);
  if (commMatch) {
    result.commission = commMatch[1];
    result.dealTerms = `Agreed Commission: ${commMatch[1]} on closed and collected client projects.`;
  }

  // Extract Skills
  const commonSkills = ['Lead Generation', 'B2B Sales', 'Client Acquisition', 'LinkedIn Sales Navigator', 'Upwork', 'Fiverr', 'Node.js', 'React', 'Cold Calling', 'Negotiation', 'Market Research', 'CRM'];
  result.skills = commonSkills.filter(s => new RegExp(`\\b${s}\\b`, 'i').test(text));

  // Summary & Notes (Aligned with 4-Step Standard Pipeline)
  // Step 1: LinkedIn Chat -> Step 2: 10-Min Google Meet -> Step 3: Demo & Finalize -> Step 4: WhatsApp Handoff
  if (result.meetingLink) {
    result.summary = `10-minute Google Meet scheduled via Google Meet. Step 2 of Outreach Funnel. Interested in ${result.reason}.`;
  } else if (/Closed \/ Partnered|Partnered/i.test(text)) {
    result.summary = `Finalized partnership with Webiox. Step 4 Active Partner: WhatsApp enabled for live client lead handoffs.`;
    result.status = 'Closed / Partnered';
  } else {
    result.summary = `Initiated discussion on LinkedIn regarding ${result.reason}. Standard Next Step: Request email on LinkedIn to schedule 10-minute Google Meet (WhatsApp unlocked post-Meet for active leads).`;
  }

  result.notes = `• Standard Funnel Progress:
  1. LinkedIn Chat (Interest / Pitch) → ${result.status === 'In Conversation' ? 'In Progress / Interest Shown' : 'Completed'}
  2. 10-Minute Google Meet (Lock time & email) → ${result.status === 'Meeting Scheduled' ? 'Scheduled' : 'Next Step: Propose time & collect email'}
  3. Demo & Finalize Partnership / Deal → Showcase Webiox tech builds & lock 15%–20% commission
  4. WhatsApp (Active Lead Handoffs) → Only shared after Meet for routing active deals

• Role & Organization:
  - Role: ${result.position || 'N/A'}
  - Company: ${result.company || 'N/A'}
  - Location: ${result.location || 'N/A'}
  - Terms: ${result.dealTerms || '15%–20% milestone referral fee on client builds'}
  - Contact Channel: ${result.email ? 'Email: ' + result.email : 'LinkedIn DM (Request email for 10-min Meet)'}`;

  return result;
}

// 1. GET /stats - Summary KPIs
router.get('/stats', async (req, res) => {
  try {
    const totalContacts = await LinkedInContact.countDocuments();
    const activeConversations = await LinkedInContact.countDocuments({
      status: { $in: ['In Conversation', 'WhatsApp Connected'] }
    });
    const meetingsScheduled = await LinkedInContact.countDocuments({
      $or: [{ status: 'Meeting Scheduled' }, { meetingDate: { $ne: null } }, { meetingLink: { $exists: true, $ne: '' } }]
    });
    const closedPartnered = await LinkedInContact.countDocuments({
      status: 'Closed / Partnered'
    });

    const reasons = await LinkedInContact.aggregate([
      { $group: { _id: '$reason', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const statuses = await LinkedInContact.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.json({
      totalContacts,
      activeConversations,
      meetingsScheduled,
      closedPartnered,
      reasons,
      statuses
    });
  } catch (err) {
    console.error('LinkedIn stats error:', err);
    res.status(500).json({ message: 'Failed to fetch LinkedIn statistics' });
  }
});

// 2. GET / - List all contacts with search & filtering
router.get('/', async (req, res) => {
  try {
    const { search, reason, status, priority, sort } = req.query;
    const filter = {};

    if (reason && reason !== 'All') {
      filter.reason = reason;
    }

    if (status && status !== 'All') {
      filter.status = status;
    }

    if (priority && priority !== 'All') {
      filter.priority = priority;
    }

    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q, 'i');
      filter.$or = [
        { name: regex },
        { position: regex },
        { company: regex },
        { mobile: regex },
        { email: regex },
        { location: regex },
        { skills: regex },
        { notes: regex },
        { summary: regex }
      ];
    }

    let sortOptions = { updatedAt: -1 };
    if (sort === 'oldest') sortOptions = { createdAt: 1 };
    if (sort === 'followup') sortOptions = { followupDate: 1 };
    if (sort === 'name') sortOptions = { name: 1 };

    const contacts = await LinkedInContact.find(filter)
      .populate('convertedToLeadId', 'name status mobile')
      .sort(sortOptions);

    res.json(contacts);
  } catch (err) {
    console.error('Fetch LinkedIn contacts error:', err);
    res.status(500).json({ message: 'Failed to fetch LinkedIn contacts' });
  }
});

// 3. GET /:id - Single contact
router.get('/:id', async (req, res) => {
  try {
    const contact = await LinkedInContact.findById(req.params.id).populate('convertedToLeadId');
    if (!contact) return res.status(404).json({ message: 'LinkedIn contact not found' });
    res.json(contact);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch contact details' });
  }
});

// 4. POST / - Create new contact
router.post('/', async (req, res) => {
  try {
    const {
      name,
      position,
      company,
      location,
      reason,
      linkedinUrl,
      mobile,
      email,
      status,
      priority,
      meetingLink,
      meetingDate,
      followupDate,
      commission,
      dealTerms,
      skills,
      summary,
      notes,
      conversationLog,
      rawSnippet,
      department
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }
    if (!position || !position.trim()) {
      return res.status(400).json({ message: 'Position / Headline is required' });
    }

    const contact = new LinkedInContact({
      name: name.trim(),
      position: position.trim(),
      company: company?.trim() || '',
      location: location?.trim() || '',
      reason: reason?.trim() || 'Freelance BDE Opportunity',
      linkedinUrl: linkedinUrl?.trim() || '',
      mobile: mobile?.trim() || '',
      email: email?.trim() || '',
      status: status || 'In Conversation',
      priority: priority || 'Warm',
      meetingLink: meetingLink?.trim() || '',
      meetingDate: meetingDate ? new Date(meetingDate) : null,
      followupDate: followupDate ? new Date(followupDate) : null,
      commission: commission?.trim() || '',
      dealTerms: dealTerms?.trim() || '',
      skills: Array.isArray(skills) ? skills : (skills ? skills.split(',').map(s => s.trim()).filter(Boolean) : []),
      summary: summary?.trim() || '',
      notes: notes?.trim() || '',
      conversationLog: Array.isArray(conversationLog) ? conversationLog : [],
      rawSnippet: rawSnippet?.trim() || '',
      department: department || 'all'
    });

    const saved = await contact.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('Create LinkedIn contact error:', err);
    res.status(500).json({ message: err.message || 'Failed to save LinkedIn contact' });
  }
});

// 5. PATCH /:id - Update contact
router.patch('/:id', async (req, res) => {
  try {
    const contact = await LinkedInContact.findById(req.params.id);
    if (!contact) return res.status(404).json({ message: 'LinkedIn contact not found' });

    const updates = req.body;
    if (updates.skills && typeof updates.skills === 'string') {
      updates.skills = updates.skills.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (updates.meetingDate) updates.meetingDate = new Date(updates.meetingDate);
    if (updates.followupDate) updates.followupDate = new Date(updates.followupDate);

    Object.assign(contact, updates);
    const updated = await contact.save();
    res.json(updated);
  } catch (err) {
    console.error('Update LinkedIn contact error:', err);
    res.status(500).json({ message: 'Failed to update LinkedIn contact' });
  }
});

// 6. DELETE /:id - Remove contact
router.delete('/:id', async (req, res) => {
  try {
    const contact = await LinkedInContact.findByIdAndDelete(req.params.id);
    if (!contact) return res.status(404).json({ message: 'Contact not found' });
    res.json({ message: 'LinkedIn contact deleted successfully', id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete contact' });
  }
});

// 7. POST /extract - AI Smart Fill & Heuristic Parser
router.post('/extract', async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ message: 'Raw copied text is required for extraction' });
  }

  // Pre-compute heuristic result as baseline
  const fallback = heuristicExtract(text);

  try {
    // Attempt Gemini AI extraction with structured JSON response
    const geminiResult = await callGeminiWithRetry(async (genAI) => {
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: { responseMimeType: 'application/json' }
      });

      const prompt = `
        You are an expert data parsing assistant for a professional CRM.
        CRITICAL OUTREACH FUNNEL RULES (Webiox SOP):
        Pipeline Stages:
        Step 1: LinkedIn Chat (Interest / Pitch)
               ↓
        Step 2: 10-Minute Google Meet (Lock time & email)
               ↓
        Step 3: Demo & Finalize Partnership / Deal
               ↓
        Step 4: WhatsApp (Only shared AFTER the Meet for active lead handoffs)

        Guidelines:
        - If still in LinkedIn chat and interest is shown (e.g. 'Sure', 'Interested'), status is 'In Conversation' (Step 1). The next step is to request their email to send a 10-min Google Meet invite.
        - Do NOT set status to 'WhatsApp Connected' for initial LinkedIn chats. WhatsApp is strictly reserved for post-Meet active lead routing!
        - If Google Meet / call time is locked, status is 'Meeting Scheduled' (Step 2).
        - If demo/sync completed, status is 'Call Completed' (Step 3).
        - If partnership deal is finalized with active projects, status is 'Closed / Partnered' (Step 4).

        Extract the following structured fields in valid JSON:

        {
          "name": "The full name of the OTHER person/contact (NOT Manthan Vaghasiya / NOT Webiox). e.g. 'Abhishek Dholakiya'",
          "position": "Their professional title/headline/role (e.g. 'Business Development Executive | Driving Revenue Growth | Client Relationship Management')",
          "company": "Current company or employer if found (e.g. 'DI Solutions')",
          "location": "Their city/location if found (e.g. 'Surat, Gujarat, India')",
          "reason": "Connection purpose / category. Choose from or specify: 'Freelancer BDE', 'Freelance BDE Opportunity', 'IT Client / Project Lead', 'Agency Partnership', 'Hiring / Candidate', 'General Networking'",
          "linkedinUrl": "Full LinkedIn URL to their profile if present",
          "mobile": "Extract their 10-digit mobile/WhatsApp number if shared (e.g. '7567664748')",
          "email": "Email address if found, else empty string",
          "status": "Estimate current pipeline stage: 'In Conversation', 'Meeting Scheduled', 'Call Completed', 'Proposal / Terms Sent', 'Closed / Partnered'",
          "priority": "'Hot' if they showed strong excitement/urgency or scheduled a call immediately, 'Warm' if normally interested, 'Cold' if hesitant",
          "meetingLink": "Google Meet or Zoom URL if shared (e.g. 'https://meet.google.com/qbb-roeq-hwa')",
          "meetingTimeStr": "Mentioned meeting time if any (e.g. '5:30 PM today')",
          "skills": ["Array of skills mentioned in profile or conversation, e.g. 'B2B Sales', 'Lead Generation', 'Node.js'"],
          "summary": "2-3 sentence executive summary of the interaction, agreed terms, and explicit next step aligned with the 4-step SOP.",
          "notes": "Detailed notes on background, agreed points (e.g. 15%-20% referral fee), and next step according to the 4-step funnel."
        }

        Raw Text:
        """
        ${text.slice(0, 15000)}
        """
      `;

      return await model.generateContent(prompt);
    });

    const rawJson = geminiResult.response.text().trim();
    const parsed = JSON.parse(rawJson);

    // Merge with fallback to ensure no empty fields if heuristic found something
    const finalData = {
      name: parsed.name || fallback.name || '',
      position: parsed.position || fallback.position || '',
      company: parsed.company || fallback.company || '',
      location: parsed.location || fallback.location || '',
      reason: parsed.reason || fallback.reason || 'Freelance BDE Opportunity',
      linkedinUrl: parsed.linkedinUrl || fallback.linkedinUrl || '',
      mobile: parsed.mobile || fallback.mobile || '',
      email: parsed.email || fallback.email || '',
      status: parsed.meetingLink || fallback.meetingLink ? 'Meeting Scheduled' : (parsed.status || fallback.status || 'In Conversation'),
      priority: parsed.priority || fallback.priority || 'Warm',
      meetingLink: parsed.meetingLink || fallback.meetingLink || '',
      meetingTimeStr: parsed.meetingTimeStr || fallback.meetingTimeStr || '',
      skills: (parsed.skills && parsed.skills.length > 0) ? parsed.skills : fallback.skills,
      summary: parsed.summary || fallback.summary || '',
      notes: parsed.notes || fallback.notes || '',
      rawSnippet: text
    };

    return res.json(finalData);

  } catch (err) {
    console.warn('Gemini extraction failed, using heuristic parser:', err.message);
    fallback.rawSnippet = text;
    return res.json(fallback);
  }
});

// 8. POST /:id/convert-to-lead - Convert LinkedIn contact into CRM Lead
router.post('/:id/convert-to-lead', async (req, res) => {
  try {
    const contact = await LinkedInContact.findById(req.params.id);
    if (!contact) return res.status(404).json({ message: 'LinkedIn contact not found' });

    if (contact.convertedToLeadId) {
      return res.status(400).json({ message: 'This contact has already been converted to a CRM Lead' });
    }

    const leadData = {
      name: contact.company || contact.name,
      ownerName: contact.name,
      mobile: contact.mobile || '9999999999',
      businessType: contact.position,
      city: contact.location || 'Surat',
      source: 'LinkedIn',
      department: contact.department === 'marketing' ? 'marketing' : 'tech',
      type: contact.priority || 'Warm',
      status: 'In Process',
      tags: ['LinkedIn', contact.reason, ...(contact.skills || [])],
      socials: {
        linkedin: contact.linkedinUrl || ''
      },
      callLogs: [
        {
          note: `Imported from LinkedIn Contact. Reason: ${contact.reason}. ${contact.summary || ''}`,
          statusAtTime: 'In Process',
          typeAtTime: contact.priority || 'Warm',
          date: new Date()
        }
      ]
    };

    const newLead = new Lead(leadData);
    await newLead.save();

    contact.convertedToLeadId = newLead._id;
    contact.status = 'Closed / Partnered';
    await contact.save();

    res.json({
      message: 'Successfully converted to CRM Lead',
      leadId: newLead._id,
      contact
    });

  } catch (err) {
    console.error('Convert to lead error:', err);
    res.status(500).json({ message: err.message || 'Failed to convert contact to CRM lead' });
  }
});

// 9. POST /:id/smart-update - Prompt-based AI update for an existing contact
router.post('/:id/smart-update', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ message: 'Update prompt or chat text is required' });
    }

    const contact = await LinkedInContact.findById(req.params.id);
    if (!contact) return res.status(404).json({ message: 'Contact not found' });

    let aiUpdates = null;

    try {
      const geminiResult = await callGeminiWithRetry(async (genAI) => {
        const model = genAI.getGenerativeModel({
          model: 'gemini-2.5-flash',
          generationConfig: { responseMimeType: 'application/json' }
        });

        const systemPrompt = `
          You are an AI sales assistant managing a CRM contact.
          The user is giving you an update about an existing contact. The update could be a natural language prompt (e.g. "we did call, he will find lead and i pay 15%") or raw copied messages from WhatsApp/LinkedIn.

          CURRENT CONTACT DETAILS:
          - Name: ${contact.name}
          - Position: ${contact.position}
          - Company: ${contact.company || 'N/A'}
          - Current Status: ${contact.status}
          - Current Priority: ${contact.priority}
          - Current Commission: ${contact.commission || 'None'}
          - Current Deal Terms: ${contact.dealTerms || 'None'}
          - Current Meeting Link: ${contact.meetingLink || 'None'}

          NEW UPDATE / PROMPT:
          """
          ${prompt.trim()}
          """

          Analyze the update and output valid JSON with ONLY the fields that should be updated.
          Allowed statuses: ['Connected', 'In Conversation', 'WhatsApp Connected', 'Meeting Scheduled', 'Call Completed', 'Proposal / Terms Sent', 'Closed / Partnered', 'Not Interested']
          Allowed priorities: ['Hot', 'Warm', 'Cold']

          Output JSON Schema:
          {
            "status": "Updated status if changed/inferred, or null to keep current",
            "priority": "Updated priority if changed/inferred, or null to keep current",
            "commission": "Updated commission e.g. '15%' if mentioned, or null to keep current",
            "dealTerms": "Clear 1-sentence description of agreed deal terms if mentioned/changed, or null",
            "meetingLink": "Google Meet/Zoom link if provided in update, or null",
            "mobile": "10-digit mobile number if shared in this update, or null",
            "logEntry": "A clear, professional 1-2 sentence activity log entry describing what happened in this update",
            "summary": "Updated executive summary of this contact including this latest development"
          }
        `;

        return await model.generateContent(systemPrompt);
      });

      aiUpdates = JSON.parse(geminiResult.response.text().trim());
    } catch (aiErr) {
      console.warn('Gemini smart-update failed, using heuristic updater:', aiErr.message);
    }

    // Heuristic fallback if AI was unavailable
    if (!aiUpdates) {
      aiUpdates = {
        status: null,
        priority: null,
        commission: null,
        dealTerms: null,
        meetingLink: null,
        mobile: null,
        logEntry: prompt.trim(),
        summary: null
      };

      const lower = prompt.toLowerCase();
      if (lower.includes('closed') || lower.includes('partner') || lower.includes('deal done') || lower.includes('agreed')) {
        aiUpdates.status = 'Closed / Partnered';
        aiUpdates.priority = 'Hot';
      } else if (lower.includes('meeting') || lower.includes('meet') || lower.includes('call scheduled')) {
        aiUpdates.status = 'Meeting Scheduled';
      } else if (lower.includes('call completed') || lower.includes('call done')) {
        aiUpdates.status = 'Call Completed';
      } else if (lower.includes('whatsapp')) {
        aiUpdates.status = 'WhatsApp Connected';
      } else if (lower.includes('not interested') || lower.includes('rejected')) {
        aiUpdates.status = 'Not Interested';
        aiUpdates.priority = 'Cold';
      }

      const comm = prompt.match(/(\d+(?:\.\d+)?%)/);
      if (comm) {
        aiUpdates.commission = comm[1];
        aiUpdates.dealTerms = `Commission agreed: ${comm[1]} on closed and collected deals.`;
      }

      const meet = prompt.match(/https:\/\/meet\.google\.com\/[a-z0-9\-]+/i);
      if (meet) {
        aiUpdates.meetingLink = meet[0];
        aiUpdates.status = 'Meeting Scheduled';
      }

      const phone = prompt.match(/(?:(?:\+91|91|0)?[ -]?)?([6-9]\d{9})\b/);
      if (phone) {
        aiUpdates.mobile = phone[1];
      }
    }

    // Apply updates to contact
    const appliedChanges = [];

    if (aiUpdates.status && aiUpdates.status !== contact.status) {
      appliedChanges.push(`Status changed to "${aiUpdates.status}"`);
      contact.status = aiUpdates.status;
    }

    if (aiUpdates.priority && aiUpdates.priority !== contact.priority) {
      appliedChanges.push(`Priority changed to "${aiUpdates.priority}"`);
      contact.priority = aiUpdates.priority;
    }

    if (aiUpdates.commission && aiUpdates.commission !== contact.commission) {
      appliedChanges.push(`Commission set to "${aiUpdates.commission}"`);
      contact.commission = aiUpdates.commission;
    }

    if (aiUpdates.dealTerms) {
      appliedChanges.push(`Deal terms updated`);
      contact.dealTerms = aiUpdates.dealTerms;
    }

    if (aiUpdates.meetingLink) {
      appliedChanges.push(`Meeting link updated`);
      contact.meetingLink = aiUpdates.meetingLink;
    }

    if (aiUpdates.mobile && !contact.mobile) {
      appliedChanges.push(`Mobile updated to ${aiUpdates.mobile}`);
      contact.mobile = aiUpdates.mobile;
    }

    if (aiUpdates.summary) {
      contact.summary = aiUpdates.summary;
    }

    // Append to notes with timestamp
    const timestamp = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const newLogText = `[Update: ${timestamp}]\n${aiUpdates.logEntry || prompt.trim()}`;
    contact.notes = contact.notes ? `${newLogText}\n\n---\n${contact.notes}` : newLogText;

    contact.conversationLog.push({
      sender: 'Manthan / AI Update',
      message: aiUpdates.logEntry || prompt.trim(),
      timestamp,
      channel: 'Other'
    });

    await contact.save();

    // If contact is converted to a CRM lead, also update the CRM lead call logs!
    if (contact.convertedToLeadId) {
      try {
        await Lead.findByIdAndUpdate(contact.convertedToLeadId, {
          $push: {
            callLogs: {
              date: new Date(),
              note: `[LinkedIn Update] ${aiUpdates.logEntry || prompt.trim()}`,
              statusAtTime: contact.status,
              typeAtTime: contact.priority || 'Warm',
              outcome: aiUpdates.status || 'Updated'
            }
          }
        });
      } catch (leadUpdateErr) {
        console.warn('Failed to sync update to converted CRM lead:', leadUpdateErr.message);
      }
    }

    res.json({
      message: 'Contact updated successfully via AI',
      contact,
      appliedChanges,
      logEntry: aiUpdates.logEntry || prompt.trim()
    });

  } catch (err) {
    console.error('Smart update error:', err);
    res.status(500).json({ message: err.message || 'Failed to apply smart update' });
  }
});

// 10. GET /backup - Full JSON Database Export for Disaster Recovery
router.get('/backup', async (req, res) => {
  try {
    const contacts = await LinkedInContact.find({}).sort({ createdAt: -1 });
    const backupData = {
      system: 'Webiox Lead Panel CRM',
      backupVersion: '2.0',
      exportedAt: new Date().toISOString(),
      totalRecords: contacts.length,
      contacts: contacts
    };
    res.json(backupData);
  } catch (err) {
    console.error('Backup export error:', err);
    res.status(500).json({ message: 'Failed to generate database backup' });
  }
});

// 11. POST /restore - Disaster Recovery Restore from JSON Backup
router.post('/restore', async (req, res) => {
  try {
    const { contacts } = req.body;
    if (!contacts || !Array.isArray(contacts)) {
      return res.status(400).json({ message: 'Invalid backup file format. Expected contacts array.' });
    }

    let restoredCount = 0;
    let insertedCount = 0;

    for (const item of contacts) {
      if (!item.name) continue;
      
      const cleanItem = { ...item };
      delete cleanItem._id;
      delete cleanItem.__v;

      const existing = await LinkedInContact.findOne({
        $or: [
          { name: cleanItem.name },
          ...(cleanItem.linkedinUrl ? [{ linkedinUrl: cleanItem.linkedinUrl }] : [])
        ]
      });

      if (existing) {
        await LinkedInContact.findByIdAndUpdate(existing._id, cleanItem, { returnDocument: 'after' });
        restoredCount++;
      } else {
        await LinkedInContact.create(cleanItem);
        insertedCount++;
      }
    }

    res.json({
      success: true,
      message: `Database restore complete: ${restoredCount} updated, ${insertedCount} newly inserted.`,
      restoredCount,
      insertedCount,
      totalProcessed: contacts.length
    });
  } catch (err) {
    console.error('Database restore error:', err);
    res.status(500).json({ message: 'Failed to restore database from backup' });
  }
});

module.exports = router;
