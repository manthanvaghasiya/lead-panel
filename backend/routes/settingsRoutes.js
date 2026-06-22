const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');

// Get global settings
router.get('/', async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({ geminiApiKeys: [] });
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update global settings
router.put('/', async (req, res) => {
  try {
    const { geminiApiKeys } = req.body;
    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = new Settings({ geminiApiKeys: geminiApiKeys || [] });
    } else {
      if (geminiApiKeys !== undefined) {
        settings.geminiApiKeys = geminiApiKeys;
      }
    }
    
    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
