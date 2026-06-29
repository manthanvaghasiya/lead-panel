const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  geminiApiKeys: [{ type: String }],
  geminiKeyStates: [{
    key: { type: String, required: true },
    exhaustedUntil: { type: Date, default: null },
    isInvalid: { type: Boolean, default: false },
    lastUsed: { type: Date, default: null }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
