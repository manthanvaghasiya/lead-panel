const { GoogleGenerativeAI } = require('@google/generative-ai');
const Settings = require('../models/Settings');

let currentKeyIndex = 0;
const keyLastUsedTime = new Map();
const requestQueue = [];
let isProcessingQueue = false;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
 * Executes the Gemini API action, managing retries, rate limits, and key rotation.
 */
async function executeWithRotation(actionFn, retryCount) {
  const keys = await getGeminiKeys();
  if (keys.length === 0) {
    const error = new Error('Gemini API key is missing. Please configure it in Settings.');
    error.status = 500;
    throw error;
  }

  let lastError;
  
  for (let i = 0; i < keys.length; i++) {
    const key = keys[(currentKeyIndex + i) % keys.length];
    
    // Enforce 4.5 seconds (4500ms) minimum delay per key for free tier (15 RPM)
    const lastUsed = keyLastUsedTime.get(key) || 0;
    const timeSinceLastUse = Date.now() - lastUsed;
    if (timeSinceLastUse < 4500) {
        await delay(4500 - timeSinceLastUse);
    }

    try {
      keyLastUsedTime.set(key, Date.now());
      const genAI = new GoogleGenerativeAI(key);
      const result = await actionFn(genAI);
      
      // Update starting index for next call to this successful key
      currentKeyIndex = (currentKeyIndex + i) % keys.length;
      return result;
    } catch (error) {
      console.warn(`Gemini API key ending in ${key.slice(-4)} failed:`, error.message);
      lastError = error;
      
      // If it's a 429 Resource Exhausted, penalty the key for 60 seconds
      if (error.message.includes('429') || error.message.includes('quota') || error.message.includes('exhausted')) {
          keyLastUsedTime.set(key, Date.now() + 60000);
      }
    }
  }

  // If all keys failed, delay and retry up to 3 times
  if (retryCount < 3 && lastError && (lastError.message.includes('429') || lastError.message.includes('quota') || lastError.message.includes('exhausted'))) {
      console.log(`All keys failed (Retry ${retryCount}/3). Waiting 15 seconds before next attempt...`);
      await delay(15000);
      return executeWithRotation(actionFn, retryCount + 1);
  }

  const finalError = new Error(`All configured Gemini API keys failed. Last error: ${lastError ? lastError.message : 'Unknown'}`);
  finalError.status = lastError ? (lastError.status || 500) : 500;
  throw finalError;
}

/**
 * Process the queue sequentially to avoid bursting.
 */
async function processQueue() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  while (requestQueue.length > 0) {
    const { actionFn, resolve, reject, retryCount } = requestQueue.shift();
    try {
      const result = await executeWithRotation(actionFn, retryCount);
      resolve(result);
    } catch (err) {
      reject(err);
    }
    // Small global delay between sequential requests
    await delay(1000);
  }

  isProcessingQueue = false;
}

/**
 * Puts Gemini API action into a queue to handle concurrency and rate-limiting gracefully.
 *
 * @param {Function} actionFn - A function that takes a GoogleGenerativeAI instance and returns a Promise.
 */
function callGeminiWithRetry(actionFn) {
  return new Promise((resolve, reject) => {
    requestQueue.push({ actionFn, resolve, reject, retryCount: 0 });
    processQueue();
  });
}

module.exports = { callGeminiWithRetry };
