const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  console.warn('Failed to set public DNS servers:', e.message);
}
const mongoose = require('mongoose');
const Lead = require('./models/Lead');

let MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI && process.env.MONGODB_USERNAME && process.env.MONGODB_PASSWORD) {
  MONGODB_URI = `mongodb+srv://${encodeURIComponent(process.env.MONGODB_USERNAME)}:${encodeURIComponent(process.env.MONGODB_PASSWORD)}@cluster0.bdba3mi.mongodb.net/?appName=Cluster0`;
}

if (MONGODB_URI) {
  MONGODB_URI = MONGODB_URI.replace(/&?useNewUrlParser=true/gi, '');
  MONGODB_URI = MONGODB_URI.replace(/&?useUnifiedTopology=true/gi, '');
  MONGODB_URI = MONGODB_URI.replace(/\?&/, '?').replace(/\?$/, '');
}

async function migrate() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const result = await Lead.updateMany(
      { $or: [{ department: { $exists: false } }, { department: null }] },
      { $set: { department: 'tech' } }
    );
    
    console.log(`Successfully migrated ${result.modifiedCount} leads to the Tech department.`);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

migrate();
