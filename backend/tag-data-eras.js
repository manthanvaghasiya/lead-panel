const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  console.warn('DNS warning:', e.message);
}

const mongoose = require('mongoose');
const Lead = require('./models/Lead');

let MONGODB_URI = process.env.MONGODB_URI || '';
if (MONGODB_URI) {
  MONGODB_URI = MONGODB_URI.replace(/&?useNewUrlParser=true/gi, '')
                           .replace(/&?useUnifiedTopology=true/gi, '')
                           .replace(/\?&/, '?')
                           .replace(/\?$/, '');
}

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    // 1. Tag all existing leads as Old Data
    const r1 = await Lead.updateMany({}, { $set: { isOldData: true, department: 'tech' } });
    console.log(`Tagged ${r1.modifiedCount} leads as isOldData=true, department=tech.`);

    // 2. Identify the 6 marketing leads and assign department: 'marketing'
    const mktNames = [
      'vasudev ghee',
      'girdhar_gaushala',
      'Ramayana Motors',
      'HANUMANT CAR WORLD',
      'Khodal Car Melo',
      'Sainath Cars'
    ];
    const r2 = await Lead.updateMany(
      {
        name: { $in: mktNames },
        createdAt: { $gte: new Date('2026-09-01') }
      },
      { $set: { department: 'marketing', isOldData: true } }
    );
    console.log(`Updated ${r2.modifiedCount} marketing leads to department='marketing'.`);

    // 3. Verification
    const countTotal = await Lead.countDocuments();
    const countOld = await Lead.countDocuments({ isOldData: true });
    const countTech = await Lead.countDocuments({ department: 'tech' });
    const countMkt = await Lead.countDocuments({ department: 'marketing' });

    console.log('\n=== CURRENT DATABASE LEADS BREAKDOWN ===');
    console.log(`Total Leads: ${countTotal}`);
    console.log(`Old Data Leads: ${countOld}`);
    console.log(`New Data Leads: ${countTotal - countOld}`);
    console.log(`Tech Leads: ${countTech}`);
    console.log(`Marketing Leads: ${countMkt}`);

    await mongoose.disconnect();
    console.log('Done.');
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
