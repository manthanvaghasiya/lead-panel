const { GoogleGenerativeAI } = require('@google/generative-ai');
const Settings = require('../models/Settings');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getGeminiKeysWithStates() {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = new Settings({ geminiApiKeys: [], geminiKeyStates: [] });
    await settings.save();
  }

  let rawKeys = [];
  if (settings.geminiApiKeys && settings.geminiApiKeys.length > 0) {
    rawKeys = settings.geminiApiKeys.filter(k => k && k.trim().length > 0);
  } else if (process.env.GEMINI_API_KEY) {
    rawKeys = process.env.GEMINI_API_KEY.split(',').map(k => k.trim()).filter(Boolean);
  }

  if (rawKeys.length === 0) return { settings, validKeys: [] };

  // Sync state array with rawKeys (in case new keys were added via UI or env)
  let stateChanged = false;
  const statesByKey = new Map();
  if (settings.geminiKeyStates) {
    settings.geminiKeyStates.forEach(st => statesByKey.set(st.key, st));
  }

  const validKeys = [];
  const now = new Date();

  for (const key of rawKeys) {
    let state = statesByKey.get(key);
    if (!state) {
      state = { key, isInvalid: false, exhaustedUntil: null, lastUsed: null };
      settings.geminiKeyStates.push(state);
      statesByKey.set(key, state);
      stateChanged = true;
    }

    if (state.isInvalid) continue;
    if (state.exhaustedUntil && state.exhaustedUntil > now) continue;

    validKeys.push({ key, state });
  }

  if (stateChanged) {
    await settings.save();
  }

  // Sort by lastUsed (ascending) to implement LRU rotation across instances
  validKeys.sort((a, b) => {
    const timeA = a.state.lastUsed ? a.state.lastUsed.getTime() : 0;
    const timeB = b.state.lastUsed ? b.state.lastUsed.getTime() : 0;
    return timeA - timeB;
  });

  return { settings, validKeys };
}

async function markKeyState(settings, key, updates) {
  try {
    const state = settings.geminiKeyStates.find(s => s.key === key);
    if (state) {
      if (updates.isInvalid !== undefined) state.isInvalid = updates.isInvalid;
      if (updates.exhaustedUntil !== undefined) state.exhaustedUntil = updates.exhaustedUntil;
      if (updates.lastUsed !== undefined) state.lastUsed = updates.lastUsed;
      await settings.save();
    }
  } catch (err) {
    console.error("Error updating key state:", err);
  }
}

async function executeWithRotation(actionFn) {
  const { settings, validKeys } = await getGeminiKeysWithStates();

  if (validKeys.length === 0) {
    const error = new Error('All configured Gemini API keys are currently exhausted or invalid. Please wait a minute or add new keys.');
    error.status = 429;
    throw error;
  }

  let lastError;
  const now = Date.now();

  for (const keyObj of validKeys) {
    const { key, state } = keyObj;

    // Enforce 4.5 seconds (4500ms) minimum delay per key to respect 15 RPM
    const lastUsedTime = state.lastUsed ? state.lastUsed.getTime() : 0;
    const timeSinceLastUse = now - lastUsedTime;
    if (timeSinceLastUse < 4500) {
      await delay(4500 - timeSinceLastUse);
    }

    try {
      // Mark as used immediately to prevent concurrent lambdas from picking this key instantly
      await markKeyState(settings, key, { lastUsed: new Date() });
      
      const genAI = new GoogleGenerativeAI(key);
      const result = await actionFn(genAI);
      return result;
    } catch (error) {
      console.warn(`Gemini API key ending in ${key.slice(-4)} failed:`, error.message);
      lastError = error;
      
      const errMessage = error.message.toLowerCase();
      
      if (errMessage.includes('api key not valid') || errMessage.includes('invalid api key')) {
        await markKeyState(settings, key, { isInvalid: true });
      } else if (errMessage.includes('429') || errMessage.includes('quota') || errMessage.includes('exhausted')) {
        // Penalty for 60 seconds
        await markKeyState(settings, key, { exhaustedUntil: new Date(Date.now() + 60000) });
      }
    }
  }

  // Fail fast, no waiting in a loop to avoid Vercel timeouts!
  const finalError = new Error(`All available keys failed. Last error: ${lastError ? lastError.message : 'Unknown'}`);
  finalError.status = lastError ? (lastError.status || 500) : 500;
  throw finalError;
}

function callGeminiWithRetry(actionFn) {
  // Since we use MongoDB for distributed rate limit tracking, 
  // we do not use an in-memory queue which would be lost in Serverless.
  // We execute immediately and fail-fast if no keys are available.
  return executeWithRotation(actionFn);
}

module.exports = { callGeminiWithRetry };
