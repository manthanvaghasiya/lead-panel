const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  console.warn('DNS warning:', e.message);
}

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Lead = require('./models/Lead');

let MONGODB_URI = process.env.MONGODB_URI || '';
if (MONGODB_URI) {
  MONGODB_URI = MONGODB_URI.replace(/&?useNewUrlParser=true/gi, '')
                           .replace(/&?useUnifiedTopology=true/gi, '')
                           .replace(/\?&/, '?')
                           .replace(/\?$/, '');
}

async function runShift() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully.');

    // 1. Create or update oldata@webiox.tech user
    const oldataUser = await User.findOne({ email: 'oldata@webiox.tech' });
    const oldataHashedPassword = await bcrypt.hash('old@12345', 12);
    if (!oldataUser) {
      await User.create({
        email: 'oldata@webiox.tech',
        password: oldataHashedPassword,
        name: 'Old Data Department',
        role: 'oldata',
        isMfaEnabled: false,
      });
      console.log('Created new user: oldata@webiox.tech with password old@12345');
    } else {
      oldataUser.password = oldataHashedPassword;
      oldataUser.role = 'oldata';
      oldataUser.name = 'Old Data Department';
      oldataUser.isMfaEnabled = false;
      await oldataUser.save({ validateBeforeSave: false });
      console.log('Updated existing user: oldata@webiox.tech');
    }

    // 2. Synchronize admin@webiox.tech password to admin@07
    const adminUser = await User.findOne({ email: 'admin@webiox.tech' });
    if (adminUser) {
      adminUser.password = await bcrypt.hash('admin@07', 12);
      adminUser.role = 'admin';
      adminUser.isMfaEnabled = false;
      adminUser.failedLoginAttempts = 0;
      adminUser.lockUntil = null;
      await adminUser.save({ validateBeforeSave: false });
      console.log('Synchronized admin@webiox.tech password to admin@07 (MFA disabled).');
    }

    // 3. Ensure tech and marketing also active
    const techUser = await User.findOne({ email: 'tech@webiox.tech' });
    if (techUser) {
      techUser.failedLoginAttempts = 0;
      techUser.lockUntil = null;
      await techUser.save({ validateBeforeSave: false });
    }
    const mktUser = await User.findOne({ email: 'marketing@webiox.tech' });
    if (mktUser) {
      mktUser.failedLoginAttempts = 0;
      mktUser.lockUntil = null;
      await mktUser.save({ validateBeforeSave: false });
    }

    // 4. Shift ALL existing leads to department: 'oldata'
    const totalLeadsBefore = await Lead.countDocuments();
    const updateResult = await Lead.updateMany(
      {},
      { $set: { department: 'oldata' } }
    );
    console.log(`Shifted ${updateResult.modifiedCount} of ${totalLeadsBefore} leads to department 'oldata'.`);

    // 5. Verify and report current state
    console.log('\n=== VERIFICATION SUMMARY ===');
    const allUsers = await User.find({}, 'email name role').lean();
    console.log('Total Users in Database:', allUsers.length);
    for (const u of allUsers) {
      console.log(`- ${u.name} (${u.role}): ${u.email} [ID: ${u._id}]`);
    }

    const leadsByDept = await Lead.aggregate([
      { $group: { _id: '$department', total: { $sum: 1 } } }
    ]);
    console.log('\nLeads Distribution by Department:');
    leadsByDept.forEach(d => {
      console.log(`- Department "${d._id}": ${d.total} leads`);
    });

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

runShift();
