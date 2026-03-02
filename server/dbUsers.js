// set up creation of database in this file
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { DATA_DIR } = require('./config/config.js');

// Use a writable data directory in production (Render Disk mounted at /data)
// Falls back to repo-local databases dir for local dev
const dataDir = DATA_DIR;
try {
  fs.mkdirSync(dataDir, { recursive: true });
} catch (e) {
  // ignore if already exists, but log other errors
  if (e.code !== 'EEXIST') {
    console.warn(`Warning: Could not create data directory ${dataDir}: ${e.message}`);
  }
}
const dbPath = path.join(dataDir, 'users.db');
const dbUsers = new sqlite3.Database(dbPath);

// Initialize database at startup
dbUsers.run(`
    CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    firstname TEXT,
    lastname TEXT,
    password TEXT)
    `
);

module.exports = dbUsers;