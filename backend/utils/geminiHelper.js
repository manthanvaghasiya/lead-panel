const { GoogleGenerativeAI } = require('@google/generative-ai');
const Settings = require('../models/Settings');

let currentKeyIndex = 0;

/**
 * Fetch available Gemini API keys from the database, falling back to the .env file.
 */
async function getGeminiKeys() {
  let keys = [];
  try {
    const settings = await Settings.findOne();
    if (settings && settings.geminiApiKeys && settings.geminiApiKeys.length > 0) {
      // Filter out any empty strings
      keys = settings.geminiApiKeys.filter(k => k && k.trim().length > 0);
    }
  } catch (e) {
    console.error("Error fetching settings for Gemini API Keys", e);
  }

  // Fallback to .env if no keys are in the database
  if (keys.length === 0 && process.env.GEMINI_API_KEY) {
    keys = process.env.GEMINI_API_KEY.split(',').map(k => k.trim()).filter(Boolean);
  }

  return keys;
}

/**
 * Executes a Gemini API action with automatic retry across configured API keys.
 *
 * @param {Function} actionFn - A function that takes a GoogleGenerativeAI instance and returns a Promise.
 */
async function callGeminiWithRetry(actionFn) {
  const keys = await getGeminiKeys();
  if (keys.length === 0) {
    const error = new Error('Gemini API key is missing. Please configure it in Settings.');
    error.status = 500;
    throw error;
  }

  let lastError;
  
  // Try keys starting from the current index
  for (let i = 0; i < keys.length; i++) {
    const key = keys[(currentKeyIndex + i) % keys.length];
    try {
      const genAI = new GoogleGenerativeAI(key);
      const result = await actionFn(genAI);
      
      // Update starting index for next call to this successful key
      currentKeyIndex = (currentKeyIndex + i) % keys.length;
      return result;
    } catch (error) {
      console.warn(`Gemini API key ending in ${key.slice(-4)} failed:`, error.message);
      lastError = error;
      // Continue to next key on failure
    }
  }

  const finalError = new Error(`All configured Gemini API keys failed. Last error: ${lastError.message}`);
  finalError.status = lastError.status || 500;
  throw finalError;
}

module.exports = { callGeminiWithRetry };
