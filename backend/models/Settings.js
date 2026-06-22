const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  geminiApiKeys: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
