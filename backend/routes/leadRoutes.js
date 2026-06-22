const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// AI Magic Fill - Extract Lead Data from Text
router.post('/ai-extract', async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ message: 'Gemini API key is missing' });
    }

    const { text, imageBase64, mimeType } = req.body;
    if (!text && !imageBase64) return res.status(400).json({ message: 'Text or image input is required' });

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
      You are an expert, highly accurate data entry assistant for a sales CRM. Your job is to extract structured lead data from a given image (e.g., a business card, flyer, screenshot) and/or a messy text note.

      EXTRACT THE FOLLOWING FIELDS EXACTLY AS REQUESTED. DO NOT GUESS DATA THAT IS NOT PRESENT. IF SOMETHING IS MISSING, RETURN AN EMPTY STRING "".

      Fields to extract:
      - "name": The Business Name, Company Name, or Shop Name. If it's just a person, leave empty or use their name if they act as a business.
      - "ownerName": The Name of the person/owner/contact. Do NOT confuse this with the business name.
      - "mobile": Extract ALL phone numbers found. Return ONLY digits (e.g., "9876543210"). If there are multiple, separate them by a comma. Remove +91 or other country codes if it's an Indian 10-digit number.
      - "address": The full address or location mentioned.
      - "city": Extract JUST the City name from the address (e.g., Surat, Delhi, Karnal, Mumbai). Must be a single word if possible.
      - "businessType": The industry, profession, or type of business (e.g., Plumber, Real Estate, Doctor, Clothing Shop).
      - "website": The exact website URL (e.g., example.com).
      - "type": Estimate interest level: 'Hot', 'Warm', or 'Cold'. Default: 'Cold'.
      - "source": Guess what product/service the lead is ASKING FOR (e.g., 'Website', 'CRM', 'Website+CRM', 'Other'). Default: 'Other'.
      - "status": Estimate current stage: 'Pending', 'In Process', 'Send Detail', 'Follow-up Letter', 'Contacted'. Default: 'Pending'.
      - "socials": A nested object containing strings for: "instagram", "facebook", "youtube", "linkedin". If you find an @handle or a link, put it in the matching platform.

      Input Text Notes: "${text || 'No text provided'}"
    `;

    const parts = [prompt];
    if (imageBase64 && mimeType) {
      parts.push({
        inlineData: {
          data: imageBase64,
          mimeType: mimeType
        }
      });
    }

    const result = await model.generateContent(parts);
    const responseText = result.response.text().trim();
    
    const extractedData = JSON.parse(responseText);
    res.json(extractedData);

  } catch (err) {
    console.error('AI Extract Error:', err);
    res.status(err.status || 500).json({ message: err.message || 'Failed to extract data using AI.' });
  }
});

// AI Magic Fill - Extract Call Log Data from Text
router.post('/ai-extract-log', async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ message: 'Gemini API key is missing' });
    }

    const { text, imageBase64, mimeType } = req.body;
    if (!text && !imageBase64) return res.status(400).json({ message: 'Text or image input is required' });

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
      You are an expert sales assistant and highly accurate data entry bot. A salesperson has provided messy notes (or an image) from a recent follow-up call with a lead.
      Extract the structured call log data from this.

      EXTRACT THE FOLLOWING FIELDS EXACTLY AS REQUESTED. DO NOT GUESS DATA THAT IS NOT PRESENT.
      Fields to extract:
      - "note": A clean summary of the conversation/notes. Do not leave this empty.
      - "typeAtTime": Must be 'Hot', 'Warm', or 'Cold' if explicitly or implicitly mentioned. Otherwise empty string.
      - "statusAtTime": Must be 'Pending', 'In Process', 'Send Detail', 'Follow-up Letter', 'Contacted', 'Won', or 'Lost'. Guess based on text, otherwise empty string.
      - "nextFollowup": Extracted future follow up date in YYYY-MM-DD format if mentioned (assume current year is 2026), otherwise empty string.

      Input Text Notes: "${text || 'No text provided'}"
    `;

    const parts = [prompt];
    if (imageBase64 && mimeType) {
      parts.push({
        inlineData: {
          data: imageBase64,
          mimeType: mimeType
        }
      });
    }

    const result = await model.generateContent(parts);
    const responseText = result.response.text().trim();
    
    const extractedData = JSON.parse(responseText);
    res.json(extractedData);

  } catch (err) {
    console.error('AI Log Extract Error:', err);
    res.status(err.status || 500).json({ message: err.message || 'Failed to extract log data using AI.' });
  }
});


// Auto-clean lead data
router.post('/:id/auto-clean', async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ message: 'Gemini API key is missing' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      Analyze this lead data:
      Name: ${lead.name || ''}
      Address: ${lead.address || ''}

      Please extract:
      1. A clean "businessType" based on the name (e.g. if name is "Hariram Motors", type is "Automotive"). If you can't guess, return "Business".
      2. A clean "city" name extracted from the address. If address is "MAIN G.T ROAD KARNAL..", city is "Karnal".

      Return ONLY raw JSON:
      {
        "businessType": "...",
        "city": "..."
      }
    `;

    const result = await model.generateContent(prompt);
    let responseText = result.response.text().trim();
    if (responseText.startsWith('\`\`\`json')) {
      responseText = responseText.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
    } else if (responseText.startsWith('\`\`\`')) {
      responseText = responseText.replace(/^\`\`\`/, '').replace(/\`\`\`$/, '').trim();
    }

    const extractedData = JSON.parse(responseText);

    let updated = false;
    if (!lead.businessType && extractedData.businessType) {
      lead.businessType = extractedData.businessType;
      updated = true;
    }
    if (!lead.city && extractedData.city) {
      lead.city = extractedData.city;
      updated = true;
    }

    if (updated) {
      await lead.save();
    }

    res.json(lead);
  } catch (err) {
    console.error('Auto Clean Error:', err);
    res.status(err.status || 500).json({ message: err.message });
  }
});

// AI extract social presence using Search Grounding
router.post('/:id/ai-social-extract', async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ message: 'Gemini API key is missing' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      tools: [{ googleSearch: {} }],
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
      You are an expert web researcher. Please perform a deep search for the following business:
      Business Name: "${lead.name}"
      Location: "${lead.city || lead.address || 'Unknown'}"
      
      Find their official web presence and extract everything you can.
      You MUST return your answer as a raw JSON object. Do not guess information. If you cannot find a specific piece of information, use an empty string for that field.
      
      Fields to extract:
      - "instagram": Official Instagram URL
      - "facebook": Official Facebook URL
      - "youtube": Official YouTube channel URL
      - "linkedin": Official LinkedIn URL
      - "summary": A short 1-2 sentence description of what the business actually does, based on search snippets.
      - "hours": Their operating hours if found online (e.g. "Mon-Fri 9AM-6PM").
      - "emails": Any public email addresses found (comma separated if multiple).
      - "platforms": An array of objects. For every platform where you find a rating (e.g., Google Maps, Justdial, Yelp, Facebook, Zomato, etc.), return an object: { "name": "Platform Name", "rating": "e.g. 4.8", "reviews": "e.g. 120", "url": "URL to the profile" }.
    `;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });
    let responseText = '';
    try {
      responseText = result.response.text().trim();
    } catch (e) {
      console.log("Error extracting text from Gemini response:", e);
      console.log("FULL RESPONSE:", JSON.stringify(result.response, null, 2));
    }
    
    console.log("GEMINI RAW SOCIAL OUTPUT:", responseText);

    if (!responseText) {
      console.log("WARNING: Gemini returned empty text. Using fallback JSON.");
      responseText = '{}';
    } else {
      if (responseText.startsWith('\`\`\`json')) {
        responseText = responseText.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
      } else if (responseText.startsWith('\`\`\`')) {
        responseText = responseText.replace(/^\`\`\`/, '').replace(/\`\`\`$/, '').trim();
      }
    }
    
    console.log("CLEANED SOCIAL JSON:", responseText);

    let extractedData = {};
    try {
      extractedData = JSON.parse(responseText);
    } catch (parseError) {
      console.log("JSON Parse Failed, defaulting to empty fields.");
      extractedData = {};
    }

    lead.socials = {
      instagram: extractedData.instagram || '',
      facebook: extractedData.facebook || '',
      youtube: extractedData.youtube || '',
      linkedin: extractedData.linkedin || '',
      rating: extractedData.rating || '',
      reviews: extractedData.reviews || '',
      summary: extractedData.summary || '',
      hours: extractedData.hours || '',
      emails: extractedData.emails || '',
      platforms: Array.isArray(extractedData.platforms) ? extractedData.platforms : []
    };

    await lead.save();
    res.json(lead);
  } catch (err) {
    console.error('AI Social Extract Error:', err);
    res.status(err.status || 500).json({ message: err.message });
  }
});

// Get all leads
router.get('/', async (req, res) => {
  try {
    const leads = await Lead.find().sort({ updatedAt: -1 });
    res.json(leads);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get a single lead
router.get('/:id', async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json(lead);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Bulk import leads (skipping duplicates based on mobile number)
router.post('/bulk-import', async (req, res) => {
  try {
    const leads = req.body;
    if (!Array.isArray(leads)) {
      return res.status(400).json({ message: 'Input data must be an array of leads.' });
    }

    // Filter out invalid leads (missing name or mobile)
    const validLeads = leads.filter(l => l.name && l.mobile);

    // Clean and standardize mobile numbers
    validLeads.forEach(lead => {
      let cleanMobile = lead.mobile.toString().replace(/\D/g, '');
      if (cleanMobile.startsWith('91') && cleanMobile.length === 12) {
        cleanMobile = cleanMobile.substring(2);
      }
      if (cleanMobile.startsWith('0')) {
        cleanMobile = cleanMobile.substring(1);
      }
      lead.mobile = cleanMobile || '0000000000';
    });

    // Get all mobile numbers from incoming list to check database
    const incomingMobiles = validLeads.map(l => l.mobile);

    // Fetch existing leads with these mobile numbers
    const existingLeads = await Lead.find({ mobile: { $in: incomingMobiles } });
    const existingMobiles = new Set(existingLeads.map(l => l.mobile));

    // Filter out leads that already exist in DB or are duplicates within the incoming array
    const uniqueIncomingLeads = [];
    const seenIncomingMobiles = new Set();

    for (const lead of validLeads) {
      const mobileClean = lead.mobile.toString().trim();
      if (!existingMobiles.has(mobileClean) && !seenIncomingMobiles.has(mobileClean)) {
        seenIncomingMobiles.add(mobileClean);
        
        // Standardize status
        let standardizedStatus = 'Pending';
        const rawStatus = (lead.status || '').toLowerCase().trim();
        if (rawStatus) {
          if (rawStatus.includes('won') || rawStatus === 'won') {
            standardizedStatus = 'Won';
          } else if (rawStatus.includes('lost') || rawStatus.includes('not interested') || rawStatus.includes('closed lost')) {
            standardizedStatus = 'Lost';
          } else if (rawStatus.includes('detail') || rawStatus.includes('send detail') || rawStatus.includes('update')) {
            standardizedStatus = 'Send Detail';
          } else if (rawStatus.includes('call back') || rawStatus.includes('follow up') || rawStatus.includes('waiting') || rawStatus.includes('in progress') || rawStatus.includes('contacted') || rawStatus.includes('process')) {
            standardizedStatus = 'In Process';
          } else if (rawStatus.includes('pending')) {
            standardizedStatus = 'Pending';
          } else {
            standardizedStatus = lead.status.charAt(0).toUpperCase() + lead.status.slice(1);
          }
        }

        // Standardize type
        let standardizedType = 'Cold';
        const rawType = (lead.type || '').toLowerCase().trim();
        if (rawType.includes('hot')) {
          standardizedType = 'Hot';
        } else if (rawType.includes('warm')) {
          standardizedType = 'Warm';
        } else if (rawType.includes('won')) {
          standardizedType = 'Won';
        } else if (rawType.includes('lost')) {
          standardizedType = 'Lost';
        }

        const structuredLead = {
          name: lead.name,
          mobile: mobileClean,
          source: lead.source || 'Website',
          type: standardizedType,
          status: standardizedStatus,
          businessType: lead.businessType,
          city: lead.city,
          address: lead.address,
          mapsUrl: lead.mapsUrl,
          socials: {
            rating: lead.rating || lead.socials?.rating || '',
            reviews: lead.reviews || lead.socials?.reviews || '',
            instagram: lead.socials?.instagram || '',
            facebook: lead.socials?.facebook || '',
            youtube: lead.socials?.youtube || '',
            linkedin: lead.socials?.linkedin || ''
          }
        };
        uniqueIncomingLeads.push(structuredLead);
      }
    }

    const skippedCount = leads.length - uniqueIncomingLeads.length;

    let importedCount = 0;
    if (uniqueIncomingLeads.length > 0) {
      const inserted = await Lead.insertMany(uniqueIncomingLeads);
      importedCount = inserted.length;
    }

    res.json({
      imported: importedCount,
      skipped: skippedCount
    });

  } catch (err) {
    console.error('Bulk Import Error:', err);
    res.status(500).json({ message: err.message || 'Failed to bulk import leads.' });
  }
});

// Create a new lead
router.post('/', async (req, res) => {
  try {
    if (!req.body.mobile) {
      return res.status(400).json({ message: 'Mobile number is required.' });
    }

    let mobileClean = req.body.mobile.toString().replace(/\D/g, '');
    if (mobileClean.startsWith('91') && mobileClean.length === 12) {
      mobileClean = mobileClean.substring(2);
    }
    if (mobileClean.startsWith('0')) {
      mobileClean = mobileClean.substring(1);
    }

    if (!mobileClean) {
      return res.status(400).json({ message: 'Valid mobile number is required.' });
    }

    // Check if lead with this mobile already exists
    const existing = await Lead.findOne({ mobile: mobileClean });
    if (existing) {
      return res.status(400).json({ message: `A lead with mobile number ${mobileClean} already exists (Lead name: "${existing.name}").` });
    }

    const leadData = { ...req.body, mobile: mobileClean };
    const lead = new Lead(leadData);
    const newLead = await lead.save();
    res.status(201).json(newLead);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update a lead (general info)
router.patch('/:id', async (req, res) => {
  try {
    let updateData = { ...req.body };
    if (req.body.mobile) {
      let mobileClean = req.body.mobile.toString().replace(/\D/g, '');
      if (mobileClean.startsWith('91') && mobileClean.length === 12) {
        mobileClean = mobileClean.substring(2);
      }
      if (mobileClean.startsWith('0')) {
        mobileClean = mobileClean.substring(1);
      }
      updateData.mobile = mobileClean;

      // Check if another lead has this mobile number
      const existing = await Lead.findOne({ mobile: mobileClean, _id: { $ne: req.params.id } });
      if (existing) {
        return res.status(400).json({ message: `A lead with mobile number ${mobileClean} already exists (Lead name: "${existing.name}").` });
      }
    }

    const updatedLead = await Lead.findByIdAndUpdate(
      req.params.id,
      updateData,
      { returnDocument: 'after', runValidators: true }
    );
    if (!updatedLead) return res.status(404).json({ message: 'Lead not found' });
    res.json(updatedLead);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Add a call log and update lead status/type/followup
router.post('/:id/call-logs', async (req, res) => {
  try {
    const { note, typeAtTime, statusAtTime, nextFollowup, outcome } = req.body;
    
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    // Add to embedded call logs
    lead.callLogs.push({
      note,
      typeAtTime,
      statusAtTime,
      nextFollowup,
      outcome
    });

    // Update lead's main status, type and followup based on the new log
    if (typeAtTime) lead.type = typeAtTime;
    if (statusAtTime) lead.status = statusAtTime;
    if (nextFollowup) lead.followupDate = nextFollowup;

    const updatedLead = await lead.save();
    res.json(updatedLead);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Generate AI Insight for a lead
router.get('/:id/ai-insight', async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ message: 'Gemini API key is missing' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const formattedLogs = lead.callLogs.map(log => 
      `Date: ${new Date(log.date).toLocaleDateString()}, Status: ${log.statusAtTime}, Note: ${log.note}`
    ).join('\n');

    const prompt = `
      You are an expert sales assistant. Analyze the following lead and their follow-up history.
      Provide your response as a JSON object with exactly these 3 keys:
      {
        "summary": "A quick 1-2 sentence summary of what the lead wants and where the deal stands.",
        "nextAction": "A short recommendation on what the salesperson should do next.",
        "draftMessage": "A polite, professional, and convincing WhatsApp message to send to the lead next, based on their history."
      }
      Do not include markdown blocks like \`\`\`json, just return the raw JSON object.

      Lead Name: ${lead.name}
      Business Type: ${lead.businessType}
      Current Status: ${lead.status}
      Follow-up History:
      ${formattedLogs}
    `;

    const result = await model.generateContent(prompt);
    let responseText = result.response.text().trim();
    
    // Clean up potential markdown formatting from Gemini
    if (responseText.startsWith('\`\`\`json')) {
      responseText = responseText.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
    } else if (responseText.startsWith('\`\`\`')) {
      responseText = responseText.replace(/^\`\`\`/, '').replace(/\`\`\`$/, '').trim();
    }

    const insight = JSON.parse(responseText);
    res.json(insight);

  } catch (err) {
    console.error('AI Insight Error:', err);
    console.log('INSIGHT ERR OBJ STATUS:', err.status, 'MESSAGE:', err.message);
    res.status(err.status || 500).json({ message: err.message });
  }
});

// Delete a lead
router.delete('/:id', async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json({ message: 'Lead deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
