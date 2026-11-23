const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const { encryptPII, generateBlindIndex } = require('../utils/cryptoVault');

/**
 * Helper to parse a single Google Maps business object
 */
function parseGoogleBusinessItem(business) {
  if (!business || !Array.isArray(business)) return null;

  const name = business[11] || '';
  if (!name) return null;

  // Extract phone
  let rawPhone = '';
  let cleanMobile = '';
  if (business[178] && Array.isArray(business[178]) && business[178][0]) {
    rawPhone = String(business[178][0]);
  } else if (business[3] && Array.isArray(business[3]) && business[3][0]) {
    rawPhone = String(business[3][0]);
  }

  if (rawPhone) {
    cleanMobile = rawPhone.replace(/\D/g, '');
    if (cleanMobile.startsWith('91') && cleanMobile.length === 12) cleanMobile = cleanMobile.substring(2);
    if (cleanMobile.startsWith('0')) cleanMobile = cleanMobile.substring(1);
  }

  // Extract rating and reviews
  let rating = '';
  let reviews = '';
  if (business[4] && Array.isArray(business[4])) {
    if (business[4][7] !== undefined && business[4][7] !== null) rating = String(business[4][7]);
    if (business[4][8] !== undefined && business[4][8] !== null) reviews = String(business[4][8]);
  }

  // Extract address
  let address = '';
  let city = '';
  if (Array.isArray(business[2])) {
    address = business[2].filter(Boolean).join(', ');
  } else if (typeof business[2] === 'string') {
    address = business[2];
  } else if (Array.isArray(business[18])) {
    address = business[18].filter(Boolean).join(', ');
  }

  // Extract city heuristics
  if (address) {
    const parts = address.split(',');
    for (const p of parts) {
      const trimmed = p.trim();
      const match = trimmed.match(/(Surat|Ahmedabad|Vadodara|Rajkot|Mumbai|Pune|Delhi|Bengaluru|Bangalore|Hyderabad|Jaipur)/i);
      if (match) {
        city = match[1];
        break;
      }
    }
  }

  // Extract website
  let website = '';
  if (business[7] && Array.isArray(business[7]) && business[7][0]) {
    website = String(business[7][0]);
  }

  // Extract category
  let category = 'Local Business';
  if (business[13] && Array.isArray(business[13]) && business[13][0]) {
    category = String(business[13][0]);
  }

  // Maps URL
  let mapsUrl = '';
  if (business[42]) {
    mapsUrl = String(business[42]);
  } else {
    mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' ' + address)}`;
  }

  return {
    name,
    mobile: cleanMobile || '0000000000',
    rawPhone,
    rating,
    reviews,
    address,
    city: city || 'Surat',
    website,
    businessType: category,
    mapsUrl,
    source: 'Google Maps',
    department: 'google',
    type: 'Cold',
    status: 'New'
  };
}

/**
 * 1. Live Google Maps Direct Search
 * Route: POST /api/google-leads/live-search
 */
router.post('/live-search', async (req, res) => {
  try {
    const { query, lat = 21.1702, lon = 72.8311, zoom = 14, batches = 1 } = req.body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ success: false, message: 'Search query is required.' });
    }

    const maxBatches = Math.min(Math.max(1, Number(batches) || 1), 3); // Up to 3 batches (60 places)
    const allFoundLeads = [];
    const seenTitles = new Set();

    for (let b = 0; b < maxBatches; b++) {
      const offset = b * 20;
      const pb = `!4m12!1m3!1d3826.902183192154!2d${Number(lon).toFixed(4)}!3d${Number(lat).toFixed(4)}!2m3!1f0!2f0!3f0!3m2!1i600!2i800!4f${Number(zoom).toFixed(1)}!7i20!8i${offset}!10b1!12m22!1m3!18b1!30b1!34e1!2m3!5m1!6e2!20e3!4b0!10b1!12b1!13b1!16b1!17m1!3e1!20m3!5e2!6b1!14b1!46m1!1b0!96b1!19m4!2m3!1i360!2i120!4i8`;

      const params = new URLSearchParams({
        tbm: 'map',
        authuser: '0',
        hl: 'en',
        q: query.trim(),
        pb: pb
      });

      const url = `https://www.google.com/search?${params.toString()}`;

      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.google.com/'
          }
        });

        if (!response.ok) {
          console.warn(`[GOOGLE-SEARCH] Batch ${b} returned status ${response.status}`);
          continue;
        }

        let bodyText = await response.text();
        const newlineIdx = bodyText.indexOf('\n');
        if (newlineIdx > -1 && bodyText.slice(0, newlineIdx).includes(")]}'")) {
          bodyText = bodyText.substring(newlineIdx + 1);
        }

        const data = JSON.parse(bodyText);
        const container = data && data[0];
        const items = container && container[1];

        if (Array.isArray(items) && items.length > 1) {
          for (let i = 1; i < items.length; i++) {
            const arr = items[i];
            const business = arr && arr[14];
            if (business) {
              const parsed = parseGoogleBusinessItem(business);
              if (parsed && parsed.name && !seenTitles.has(parsed.name.toLowerCase())) {
                seenTitles.add(parsed.name.toLowerCase());
                allFoundLeads.push(parsed);
              }
            }
          }
        }
      } catch (batchErr) {
        console.error(`[GOOGLE-SEARCH] Error in batch ${b}:`, batchErr.message);
      }
    }

    return res.json({
      success: true,
      query,
      count: allFoundLeads.length,
      leads: allFoundLeads
    });
  } catch (err) {
    console.error('[GOOGLE-SEARCH] Exception:', err);
    return res.status(500).json({ success: false, message: 'Failed to search Google Maps: ' + err.message });
  }
});

/**
 * 2. Ingest Discovered Leads Directly Into Database
 * Route: POST /api/google-leads/save-direct
 */
router.post('/save-direct', async (req, res) => {
  try {
    const { leads } = req.body;
    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ success: false, message: 'Leads array cannot be empty.' });
    }

    const blindIndexes = [];
    const sanitized = [];

    for (const item of leads) {
      if (!item.name) continue;

      let cleanMobile = item.mobile ? String(item.mobile).replace(/\D/g, '') : '';
      if (cleanMobile.startsWith('91') && cleanMobile.length === 12) cleanMobile = cleanMobile.substring(2);
      if (cleanMobile.startsWith('0')) cleanMobile = cleanMobile.substring(1);
      cleanMobile = cleanMobile || '0000000000';

      const bIndex = generateBlindIndex(cleanMobile);
      blindIndexes.push(bIndex);

      sanitized.push({
        name: String(item.name).substring(0, 100),
        mobile: cleanMobile,
        mobileBlindIndex: bIndex,
        businessType: item.businessType ? String(item.businessType).substring(0, 100) : 'Local Business',
        city: item.city ? String(item.city).substring(0, 100) : 'Surat',
        address: item.address ? String(item.address).substring(0, 300) : '',
        mapsUrl: item.mapsUrl ? String(item.mapsUrl).substring(0, 500) : '',
        website: item.website ? String(item.website).substring(0, 300) : '',
        source: 'Google Maps',
        department: 'google',
        type: 'Cold',
        status: 'New',
        socials: {
          rating: item.rating ? String(item.rating).substring(0, 20) : '',
          reviews: item.reviews ? String(item.reviews).substring(0, 20) : '',
          emails: item.emails ? String(item.emails).substring(0, 500) : ''
        }
      });
    }

    // Check duplicates against existing database
    const existing = await Lead.find({ mobileBlindIndex: { $in: blindIndexes } }).select('mobileBlindIndex');
    const existingSet = new Set(existing.map(e => e.mobileBlindIndex));

    const toInsert = [];
    const seenBatch = new Set();
    let duplicatesCount = 0;

    for (const s of sanitized) {
      if (s.mobile !== '0000000000' && existingSet.has(s.mobileBlindIndex)) {
        duplicatesCount++;
        continue;
      }
      if (s.mobile !== '0000000000' && seenBatch.has(s.mobileBlindIndex)) {
        duplicatesCount++;
        continue;
      }
      seenBatch.add(s.mobileBlindIndex);
      // Encrypt mobile & emails with AES-256-GCM before batch insert
      s.mobile = encryptPII(s.mobile);
      if (s.socials?.emails && !s.socials.emails.includes(':')) {
        s.socials.emails = encryptPII(s.socials.emails);
      }
      toInsert.push(s);
    }

    let insertedCount = 0;
    if (toInsert.length > 0) {
      const created = await Lead.insertMany(toInsert);
      insertedCount = created.length;
    }

    return res.json({
      success: true,
      savedCount: insertedCount,
      duplicatesCount,
      message: `Successfully saved ${insertedCount} leads into CRM database! (${duplicatesCount} duplicates skipped)`
    });
  } catch (err) {
    console.error('[GOOGLE-SAVE-DIRECT] Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to save leads: ' + err.message });
  }
});

module.exports = router;
