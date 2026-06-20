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
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      You are an expert sales assistant. A salesperson has provided an image (like a business card) and/or dictated some messy notes about a new lead.
      Extract the structured lead data from this.
      Return ONLY a JSON object with exactly these keys:
      {
        "name": "Extracted business name or main entity name, or empty string if not found",
        "ownerName": "Extracted owner/contact person name, or empty string",
        "mobile": "Extracted mobile number (digits only) or empty string",
        "address": "Extracted full address/location or empty string",
        "city": "Extract JUST the City name from the address (e.g. Surat, Delhi, Karnal) or empty string",
        "businessType": "Extract the business type or profession if mentioned, else empty string",
        "type": "Must be 'Hot', 'Warm', or 'Cold' based on their interest level. Default to 'Cold'.",
        "source": "Must be 'Website', 'CRM', 'Website+CRM', or 'Other'. Guess based on text/image, default to 'Other'.",
        "status": "Must be 'Pending', 'In Process', 'Send Detail', 'Follow-up Letter', 'Contacted'. Guess based on text/image, default to 'Pending'."
      }
      Do not include any markdown blocks like \`\`\`json. Just the raw JSON.

      Messy Notes: "${text || 'No text provided'}"
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
    let responseText = result.response.text().trim();
    
    if (responseText.startsWith('\`\`\`json')) {
      responseText = responseText.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
    } else if (responseText.startsWith('\`\`\`')) {
      responseText = responseText.replace(/^\`\`\`/, '').replace(/\`\`\`$/, '').trim();
    }

    const extractedData = JSON.parse(responseText);
    res.json(extractedData);

  } catch (err) {
    console.error('AI Extract Error:', err);
    res.status(500).json({ message: 'Failed to extract data using AI.' });
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
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      You are an expert sales assistant. A salesperson has provided messy notes (or an image) from a recent follow-up call with a lead.
      Extract the structured call log data from this.
      Return ONLY a JSON object with exactly these keys:
      {
        "note": "A clean summary of the conversation/notes. Do not leave this empty.",
        "typeAtTime": "Must be 'Hot', 'Warm', or 'Cold' if explicitly or implicitly mentioned. Otherwise empty string.",
        "statusAtTime": "Must be 'Pending', 'In Process', 'Send Detail', 'Follow-up Letter', 'Contacted', 'Won', or 'Lost'. Guess based on text, otherwise empty string.",
        "nextFollowup": "Extracted future follow up date in YYYY-MM-DD format if mentioned (assume current year is 2026), otherwise empty string."
      }
      Do not include any markdown blocks like \`\`\`json. Just the raw JSON.

      Messy Notes: "${text || 'No text provided'}"
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
    let responseText = result.response.text().trim();
    
    if (responseText.startsWith('\`\`\`json')) {
      responseText = responseText.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
    } else if (responseText.startsWith('\`\`\`')) {
      responseText = responseText.replace(/^\`\`\`/, '').replace(/\`\`\`$/, '').trim();
    }

    const extractedData = JSON.parse(responseText);
    res.json(extractedData);

  } catch (err) {
    console.error('AI Log Extract Error:', err);
    res.status(500).json({ message: 'Failed to extract log data using AI.' });
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
    res.status(500).json({ message: err.message });
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
      tools: [{ googleSearch: {} }] 
    });

    const prompt = `
      Search the web for business: "${lead.name}" located in "${lead.city || lead.address || ''}".
      Find their official social media handles/links (Instagram, Facebook, YouTube, LinkedIn). Do not guess or hallucinate. If you can't find them, return empty string.
      Also find their business rating (out of 5) and total number of reviews from Google Reviews, Justdial, or IndiaMART.
      
      Return ONLY raw JSON matching exactly this structure:
      {
        "instagram": "username or link or empty",
        "facebook": "username or link or empty",
        "youtube": "username or link or empty",
        "linkedin": "username or link or empty",
        "rating": "e.g. 4.5 or empty",
        "reviews": "e.g. 40 or empty"
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

    lead.socials = {
      instagram: extractedData.instagram || '',
      facebook: extractedData.facebook || '',
      youtube: extractedData.youtube || '',
      linkedin: extractedData.linkedin || '',
      rating: extractedData.rating || '',
      reviews: extractedData.reviews || ''
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

// Create a new lead
router.post('/', async (req, res) => {
  const lead = new Lead(req.body);
  try {
    const newLead = await lead.save();
    res.status(201).json(newLead);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update a lead (general info)
router.patch('/:id', async (req, res) => {
  try {
    const updatedLead = await Lead.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
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
    res.status(500).json({ message: 'Failed to generate AI insight. Ensure API key is valid.' });
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
