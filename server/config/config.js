require('dotenv').config({ path: '../.env' });
const path = require('path');
const fs = require('fs');

// Data directory configuration
// Use DATA_DIR environment variable if set (e.g., /data for Render Disk), otherwise use local databases dir
// Validate that the directory is writable, fall back to local if not
function getDataDir() {
  const requestedDir = process.env.DATA_DIR || path.join(__dirname, '../databases');
  
  // Always validate write permissions, especially for /data
  try {
    // Try to create the directory to check permissions
    fs.mkdirSync(requestedDir, { recursive: true });
    // Try to write a test file to verify write permissions
    const testFile = path.join(requestedDir, '.write-test');
    try {
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      console.log(`✅ Using data directory: ${requestedDir}`);
      return requestedDir;
    } catch (writeErr) {
      // Directory exists but not writable
      throw new Error(`Directory exists but not writable: ${writeErr.message}`);
    }
  } catch (err) {
    // Fall back to local directory if requested directory is not accessible
    const fallbackDir = path.join(__dirname, '../databases');
    console.warn(`⚠️  Cannot write to ${requestedDir} (${err.message}), falling back to: ${fallbackDir}`);
    try {
      fs.mkdirSync(fallbackDir, { recursive: true });
      return fallbackDir;
    } catch (fallbackErr) {
      console.error(`❌ Cannot create fallback directory ${fallbackDir}: ${fallbackErr.message}`);
      throw fallbackErr;
    }
  }
}

const DATA_DIR = getDataDir();

// Environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || null;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o'; // Default to gpt-4o, a valid current model
const GRAPHHOPPER_API_KEY = process.env.GRAPHHOPPER_API_KEY || null;

// API URLs
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Routing API config
const ROUTING_APIS = {
  // Valhalla doesn't need API key since we're using public API (Primary) 
  VALHALLA: {
    url: 'https://valhalla1.openstreetmap.de/route',
    key: null, 
  },
  
  // GraphHopper API (Backup 500 credits per day free tier, limited to 5 locations per request)
  GRAPHHOPPER: {
    url: 'https://graphhopper.com/api/1/route',
    key: GRAPHHOPPER_API_KEY,
  },
};

const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY || null;

module.exports = {
  // Data directory
  DATA_DIR,
  
  // Environment variables
  OPENAI_API_KEY,
  OPENAI_MODEL,
  GRAPHHOPPER_API_KEY,
  
  // API URLs
  OPENAI_API_URL,
  
  // Configuration objects
  ROUTING_APIS,
  GEOAPIFY_API_KEY
};