require('dotenv').config();
const mongoose = require('mongoose');
const xlsx = require('xlsx');
const Lead = require('./models/Lead');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    await Lead.deleteMany({});
    console.log('Deleted all existing leads');

    const workbook = xlsx.readFile('d:\\webiox lead panel\\frontend\\public\\lead data.xlsx');
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    console.log(`Found ${data.length} rows to import`);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Process in batches of 20
    const BATCH_SIZE = 20;
    
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      console.log(`Processing batch ${i/BATCH_SIZE + 1} of ${Math.ceil(data.length/BATCH_SIZE)}...`);
      const batch = data.slice(i, i + BATCH_SIZE);
      
      const promptData = batch.map((row, idx) => {
        let name = row['Clean Name'] || row['Original Name'] || '';
        if (name.includes('|')) name = name.split('|')[0].trim();
        return `[${idx}] Name: ${name}, Address: ${row['Original Address'] || ''}`;
      }).join('\n');

      let batchAiResults = [];
      try {
        const prompt = `
          I have a list of Indian business leads. For each lead, extract:
          1. "businessType": Guess based on the name. If you can't, return "Business".
          2. "city": Extract the clean city name from the address. If unknown, return empty string.
          
          Data:
          ${promptData}

          Return ONLY a valid JSON array of objects in the EXACT same order (from index 0 to ${batch.length - 1}), like this:
          [
            { "businessType": "...", "city": "..." },
            ...
          ]
          Do not include \`\`\`json blocks.
        `;

        const result = await model.generateContent(prompt);
        let responseText = result.response.text().trim();
        if (responseText.startsWith('\`\`\`json')) responseText = responseText.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
        else if (responseText.startsWith('\`\`\`')) responseText = responseText.replace(/^\`\`\`/, '').replace(/\`\`\`$/, '').trim();

        batchAiResults = JSON.parse(responseText);
      } catch (err) {
        console.error("AI Batch extraction failed, falling back to empty. Error:", err.message);
        // Fallback array
        batchAiResults = batch.map(() => ({ businessType: '', city: '' }));
      }

      // Save each row in the batch
      for (let j = 0; j < batch.length; j++) {
        const row = batch[j];
        const aiData = batchAiResults[j] || { businessType: '', city: '' };

        let name = row['Original Name'] || 'Unknown Lead';
        if (name.includes('|')) name = name.split('|')[0].trim();

        let ownerName = row['Clean Name'] || '';
        if (ownerName.includes('|')) ownerName = ownerName.split('|')[0].trim();

        let mobile = (row['Mobile No.'] || '').toString().replace(/\D/g, '');
        if (mobile.startsWith('0')) mobile = mobile.substring(1);
        if (!mobile) mobile = '0000000000';

        let address = row['Original Address'] || '';
        let businessType = row['Business Type'] || aiData.businessType || '';
        let city = aiData.city || '';

        let rawSource = (row['which type?'] || '').toLowerCase();
        let source = 'Other';
        if (rawSource.includes('website') && rawSource.includes('crm')) source = 'Website+CRM';
        else if (rawSource.includes('website')) source = 'Website';
        else if (rawSource.includes('crm')) source = 'CRM';

        let rawType = (row['Type'] || 'Cold').toLowerCase();
        let type = 'Cold';
        if (rawType.includes('hot')) type = 'Hot';
        if (rawType.includes('warm')) type = 'Warm';

        let rawStatus = (row['Status'] || 'Pending').toLowerCase();
        let status = 'Pending';
        if (rawStatus.includes('in progress') || rawStatus.includes('contacted')) status = 'In Process';
        else if (rawStatus.includes('detail')) status = 'Send Detail';
        else if (rawStatus.includes('letter')) status = 'Follow-up Letter';
        else if (rawStatus.includes('won')) status = 'Won';
        else if (rawStatus.includes('lost')) status = 'Lost';

        let callLogs = [];
        if (row['Original Reason']) callLogs.push({ note: "Original Reason: " + row['Original Reason'], timestamp: new Date() });
        if (row['followup 1']) callLogs.push({ note: "Followup 1: " + row['followup 1'], timestamp: new Date() });
        if (row['followup 2']) callLogs.push({ note: "Followup 2: " + row['followup 2'], timestamp: new Date() });

        const lead = new Lead({
          name,
          ownerName,
          mobile,
          businessType,
          city,
          address,
          type,
          source,
          status,
          callLogs
        });

        await lead.save();
      }
    }

    console.log('Import complete');
    process.exit(0);
  } catch (err) {
    console.error('Import failed', err);
    process.exit(1);
  }
};

run();
