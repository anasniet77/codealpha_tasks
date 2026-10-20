/**
 * Task 3 — Cloud-Based Bus Pass System
 * Database models and schema
 */
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.TASK3_DB_PATH || path.join(__dirname, '..', 'data', 'buspass.db');

function createDbInstance(filePath) {
  try {
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(filePath);
    db.pragma = function(str) {
      try { db.exec(`PRAGMA ${str}`); } catch (e) {}
    };
    db.transaction = function(fn) {
      return function(...args) {
        db.exec('BEGIN');
        try {
          const res = fn(...args);
          db.exec('COMMIT');
          return res;
        } catch (err) {
          db.exec('ROLLBACK');
          throw err;
        }
      };
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

  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Pass types
    CREATE TABLE IF NOT EXISTS pass_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      duration_days INTEGER NOT NULL,
      price REAL NOT NULL,
      is_active INTEGER DEFAULT 1
    );

    -- Bus routes
    CREATE TABLE IF NOT EXISTS routes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_number TEXT NOT NULL UNIQUE,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      stops TEXT,
      is_active INTEGER DEFAULT 1
    );

    -- Pass applications
    CREATE TABLE IF NOT EXISTS pass_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      pass_type_id INTEGER NOT NULL,
      route_id INTEGER,
      status TEXT NOT NULL DEFAULT 'pending',
      start_date DATE,
      end_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (pass_type_id) REFERENCES pass_types(id),
      FOREIGN KEY (route_id) REFERENCES routes(id)
    );

    -- Transactions (payments)
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      application_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'card',
      status TEXT NOT NULL DEFAULT 'pending',
      idempotency_key TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (application_id) REFERENCES pass_applications(id)
    );

    -- Active passes (issued)
    CREATE TABLE IF NOT EXISTS active_passes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pass_number TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      application_id INTEGER NOT NULL,
      pass_type_id INTEGER NOT NULL,
      route_id INTEGER,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (application_id) REFERENCES pass_applications(id),
      FOREIGN KEY (pass_type_id) REFERENCES pass_types(id),
      FOREIGN KEY (route_id) REFERENCES routes(id)
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_transactions_idempotency ON transactions(idempotency_key);
    CREATE INDEX IF NOT EXISTS idx_pass_applications_user ON pass_applications(user_id);
    CREATE INDEX IF NOT EXISTS idx_active_passes_user ON active_passes(user_id);
  `);

  // Seed default pass types if empty
  const count = db.prepare('SELECT COUNT(*) as c FROM pass_types').get().c;
  if (count === 0) {
    const insert = db.prepare('INSERT INTO pass_types (name, description, duration_days, price) VALUES (?, ?, ?, ?)');
    insert.run('Daily Pass', 'Valid for 1 day of unlimited travel', 1, 5.00);
    insert.run('Weekly Pass', 'Valid for 7 days of unlimited travel', 7, 25.00);
    insert.run('Monthly Pass', 'Valid for 30 days of unlimited travel', 30, 75.00);
    insert.run('Quarterly Pass', 'Valid for 90 days of unlimited travel', 90, 180.00);
    insert.run('Annual Pass', 'Valid for 365 days of unlimited travel', 365, 600.00);
    insert.run('Student Monthly', 'Discounted monthly pass for students', 30, 45.00);
    insert.run('Senior Monthly', 'Discounted monthly pass for seniors', 30, 40.00);
  }

  // Seed default routes if empty
  const routeCount = db.prepare('SELECT COUNT(*) as c FROM routes').get().c;
  if (routeCount === 0) {
    const insertRoute = db.prepare('INSERT INTO routes (route_number, origin, destination, stops) VALUES (?, ?, ?, ?)');
    insertRoute.run('R1', 'Downtown Terminal', 'Airport', 'Central Park, University, Tech Hub, Airport');
    insertRoute.run('R2', 'Suburb North', 'City Center', 'Green Valley, West End, Main Square, City Center');
    insertRoute.run('R3', 'East Side', 'West Beach', 'Market District, Old Town, Harbor, West Beach');
    insertRoute.run('R4', 'South Station', 'North Hills', 'Industrial Zone, Riverside, Midtown, North Hills');
    insertRoute.run('R5', 'University', 'Shopping Mall', 'Library, Sports Complex, Residential Area, Shopping Mall');
  }

  return db;
}

module.exports = { getDb, DB_PATH };
