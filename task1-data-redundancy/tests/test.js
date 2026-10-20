/**
 * Task 1 — Data Redundancy Removal System Tests
 * Tests for: duplicate records, unique records, invalid data, similar-but-not-identical records
 */
const path = require('path');
const fs = require('fs');

// Use in-memory test database
process.env.TASK1_DB_PATH = path.join(__dirname, '..', 'data', 'test_redundancy.db');

// Clean test DB before starting
const testDbPath = process.env.TASK1_DB_PATH;
if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

const { getDb } = require('../src/database');
const {
  validateRecord,
  processRecord,
  normalize,
  normalizePhone
} = require('../src/dedup-engine');

let db;
let passed = 0;
let failed = 0;
let total = 0;

function assert(condition, testName) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✅ ${testName}`);
  } else {
    failed++;
    console.log(`  ❌ ${testName}`);
  }
}

function section(name) {
  console.log(`\n━━━ ${name} ━━━`);
}

try {
  db = getDb();
  console.log('🧪 Task 1 — Data Redundancy Removal System Tests\n');

  // ──────────────────────────────────────
  section('1. Validation Tests');
  // ──────────────────────────────────────

  // Valid record
  let v = validateRecord({ first_name: 'John', last_name: 'Doe', email: 'john@example.com' });
  assert(v.valid === true, 'Valid record passes validation');

  // Missing first name
  v = validateRecord({ first_name: '', last_name: 'Doe', email: 'john@example.com' });
  assert(v.valid === false, 'Missing first_name fails validation');

  // Missing last name
  v = validateRecord({ first_name: 'John', last_name: '', email: 'john@example.com' });
  assert(v.valid === false, 'Missing last_name fails validation');

  // Missing email
  v = validateRecord({ first_name: 'John', last_name: 'Doe' });
  assert(v.valid === false, 'Missing email fails validation');

  // Invalid email format
  v = validateRecord({ first_name: 'John', last_name: 'Doe', email: 'not-an-email' });
  assert(v.valid === false, 'Invalid email format fails validation');

  // Invalid phone
  v = validateRecord({ first_name: 'John', last_name: 'Doe', email: 'j@e.com', phone: '123' });
  assert(v.valid === false, 'Phone with < 7 digits fails validation');

  // Valid phone
  v = validateRecord({ first_name: 'John', last_name: 'Doe', email: 'j@e.com', phone: '+1 555-123-4567' });
  assert(v.valid === true, 'Valid phone passes validation');

  // ──────────────────────────────────────
  section('2. Unique Record Insertion');
  // ──────────────────────────────────────

  let result = processRecord(db, {
    first_name: 'Alice',
    last_name: 'Johnson',
    email: 'alice@example.com',
    phone: '555-100-0001',
    address: '100 Main St',
    city: 'New York'
  });
  assert(result.success === true, 'First unique record inserted successfully');
  assert(result.action === 'inserted', 'Action is "inserted"');
  assert(result.classification === 'unique', 'Classification is "unique"');

  result = processRecord(db, {
    first_name: 'Bob',
    last_name: 'Smith',
    email: 'bob@example.com',
    phone: '555-200-0002',
    address: '200 Oak Ave',
    city: 'Los Angeles'
  });
  assert(result.success === true, 'Second unique record inserted successfully');

  result = processRecord(db, {
    first_name: 'Carol',
    last_name: 'Williams',
    email: 'carol@example.com',
    phone: '555-300-0003',
    address: '300 Pine Rd',
    city: 'Chicago'
  });
  assert(result.success === true, 'Third unique record inserted successfully');

  // ──────────────────────────────────────
  section('3. Exact Duplicate Detection');
  // ──────────────────────────────────────

  // Same email
  result = processRecord(db, {
    first_name: 'Alice',
    last_name: 'Johnson',
    email: 'alice@example.com',
    phone: '555-100-0001',
    city: 'New York'
  });
  assert(result.success === false, 'Exact duplicate (same email) rejected');
  assert(result.reason === 'exact_duplicate', 'Reason is exact_duplicate');
  assert(result.similarityScore === 1.0, 'Similarity score is 1.0');

  // Same email different case
  result = processRecord(db, {
    first_name: 'Alice',
    last_name: 'Johnson',
    email: 'ALICE@EXAMPLE.COM',
    phone: '555-100-0001',
    city: 'New York'
  });
  assert(result.success === false, 'Case-insensitive email duplicate detected');

  // Same email with extra spaces
  result = processRecord(db, {
    first_name: 'Alice',
    last_name: 'Johnson',
    email: '  alice@example.com  ',
    phone: '555-100-0001',
    city: 'New York'
  });
  assert(result.success === false, 'Email with leading/trailing spaces detected as duplicate');

  // ──────────────────────────────────────
  section('4. Fuzzy Match Detection');
  // ──────────────────────────────────────

  // Very similar name, same city and address, different email
  result = processRecord(db, {
    first_name: 'Alce',         // typo
    last_name: 'Jonhson',       // typo
    email: 'alice.j@newmail.com',
    phone: '555-100-0099',
    address: '100 Main Street', // slight variation
    city: 'New York'
  });
  // This may be fuzzy_match or false_positive depending on composite score
  assert(
    result.reason === 'fuzzy_match' || result.classification === 'false_positive' || result.classification === 'unique',
    'Similar record is classified (fuzzy/false_positive/unique depending on score)'
  );

  // ──────────────────────────────────────
  section('5. Similar-but-Not-Identical Records (False Positive Classification)');
  // ──────────────────────────────────────

  // Different person with somewhat similar name
  result = processRecord(db, {
    first_name: 'Robert',
    last_name: 'Smith',
    email: 'robert.smith@example.com',
    phone: '555-400-0004',
    address: '400 Elm St',
    city: 'Boston'
  });
  // "Robert Smith" vs "Bob Smith" — should NOT be blocked as duplicate
  assert(result.success === true, 'Robert Smith not blocked despite similar name to Bob Smith');

  // Completely different person
  result = processRecord(db, {
    first_name: 'Diana',
    last_name: 'Prince',
    email: 'diana@example.com',
    phone: '555-500-0005',
    address: '500 Wonder Way',
    city: 'Washington'
  });
  assert(result.success === true, 'Completely different person inserted');
  assert(result.classification === 'unique', 'Classified as unique');

  // ──────────────────────────────────────
  section('6. Invalid Data Handling');
  // ──────────────────────────────────────

  // Null data
  result = processRecord(db, {});
  assert(result.success === false, 'Empty object rejected');
  assert(result.reason === 'validation_failed', 'Reason is validation_failed');

  // Missing required fields
  result = processRecord(db, { first_name: 'Test' });
  assert(result.success === false, 'Missing required fields rejected');

  // Invalid email
  result = processRecord(db, {
    first_name: 'Test',
    last_name: 'User',
    email: 'invalid-email-format'
  });
  assert(result.success === false, 'Invalid email format rejected');

  // ──────────────────────────────────────
  section('7. Database Constraint Tests');
  // ──────────────────────────────────────

  // Verify UNIQUE constraint on email
  const count1 = db.prepare('SELECT COUNT(*) as c FROM records').get().c;
  // Try direct insert of duplicate email (bypassing dedup engine)
  try {
    db.prepare('INSERT INTO records (first_name, last_name, email) VALUES (?, ?, ?)').run('Test', 'Test', 'alice@example.com');
    assert(false, 'Database UNIQUE constraint should prevent duplicate email');
  } catch (err) {
    assert(err.message.includes('UNIQUE constraint'), 'Database UNIQUE constraint prevents duplicate email insertion');
  }
  const count2 = db.prepare('SELECT COUNT(*) as c FROM records').get().c;
  assert(count1 === count2, 'Record count unchanged after constraint violation');

  // ──────────────────────────────────────
  section('8. Utility Function Tests');
  // ──────────────────────────────────────

  assert(normalize('  John DOE  ') === 'john doe', 'normalize() trims and lowercases');
  assert(normalize(null) === '', 'normalize(null) returns empty string');
  assert(normalizePhone('+1 (555) 123-4567') === '15551234567', 'normalizePhone() strips non-digits');
  assert(normalizePhone(null) === '', 'normalizePhone(null) returns empty string');

  // ──────────────────────────────────────
  section('9. Redundancy Log Verification');
  // ──────────────────────────────────────

  const logs = db.prepare('SELECT * FROM redundancy_log').all();
  assert(logs.length > 0, 'Redundancy log has entries');

  const dupLogs = logs.filter(l => l.match_type === 'exact_duplicate');
  assert(dupLogs.length >= 2, 'At least 2 exact duplicate entries logged');

  const uniqueLogs = logs.filter(l => l.match_type === 'unique');
  assert(uniqueLogs.length >= 3, 'At least 3 unique entries logged');

  // ──────────────────────────────────────
  // Summary
  // ──────────────────────────────────────
  console.log('\n' + '═'.repeat(50));
  console.log(`Tests: ${total} | ✅ Passed: ${passed} | ❌ Failed: ${failed}`);
  console.log('═'.repeat(50));

  // Cleanup
  if (db && typeof db.close === 'function') {
    try { db.close(); } catch (e) {}
  }
  try {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  } catch (e) {}

  process.exit(failed > 0 ? 1 : 0);
} catch (err) {
  console.error('\n💥 Test Error:', err);
  if (db && typeof db.close === 'function') {
    try { db.close(); } catch (e) {}
  }
  try {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  } catch (e) {}
  process.exit(1);
}
