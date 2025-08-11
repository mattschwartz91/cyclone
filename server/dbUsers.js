// set up creation of database in this file
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'databases', 'users.db');
const dbUsers = new sqlite3.Database(dbPath);

// Initialize database at startup
dbUsers.run(`
    CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT)
    `
);

module.exports = dbUsers;