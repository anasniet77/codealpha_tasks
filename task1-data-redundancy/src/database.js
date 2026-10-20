/**
 * Task 1 — Data Redundancy Removal System
 * Database initialization and management
 */
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.TASK1_DB_PATH || path.join(__dirname, '..', 'data', 'redundancy.db');

function createDbInstance(filePath) {
  try {
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(filePath);
    db.pragma = function(str) {
      try { db.exec(`PRAGMA ${str}`); } catch (e) {}
    };
    return db;
  } catch (err) {
    const BetterSqlite3 = require('better-sqlite3');
    return new BetterSqlite3(filePath);
  }
}

function getDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = createDbInstance(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      address TEXT,
      city TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS redundancy_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      incoming_data TEXT NOT NULL,
      matched_record_id INTEGER,
      match_type TEXT NOT NULL,  -- 'exact_duplicate', 'fuzzy_match', 'false_positive', 'unique'
      similarity_score REAL,
      action_taken TEXT NOT NULL, -- 'rejected', 'flagged', 'inserted'
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (matched_record_id) REFERENCES records(id)
    );

    CREATE INDEX IF NOT EXISTS idx_records_email ON records(email);
    CREATE INDEX IF NOT EXISTS idx_records_name ON records(first_name, last_name);
    CREATE INDEX IF NOT EXISTS idx_records_phone ON records(phone);
  `);

  return db;
}

module.exports = { getDb, DB_PATH };
