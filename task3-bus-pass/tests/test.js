/**
 * Task 3 — Cloud-Based Bus Pass System Tests
 */
const path = require('path');
const fs = require('fs');

process.env.TASK3_DB_PATH = path.join(__dirname, '..', 'data', 'test_buspass.db');
process.env.TASK3_JWT_SECRET = 'test-secret-key-123';

const testDbPath = process.env.TASK3_DB_PATH;
if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

const { getDb } = require('../src/models/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateToken } = require('../src/middleware/auth');

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

(async () => {
  try {
    db = getDb();
    console.log('🧪 Task 3 — Cloud-Based Bus Pass System Tests\n');

    // ──────────────────────────────────────
    section('1. Database Schema Tests');
    // ──────────────────────────────────────

    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
    assert(tables.includes('users'), 'Users table exists');
    assert(tables.includes('pass_types'), 'Pass types table exists');
    assert(tables.includes('routes'), 'Routes table exists');
    assert(tables.includes('pass_applications'), 'Pass applications table exists');
    assert(tables.includes('transactions'), 'Transactions table exists');
    assert(tables.includes('active_passes'), 'Active passes table exists');

    // ──────────────────────────────────────
    section('2. Seed Data Tests');
    // ──────────────────────────────────────

    const passTypesCount = db.prepare('SELECT COUNT(*) as c FROM pass_types').get().c;
    assert(passTypesCount >= 5, `At least 5 pass types seeded (found ${passTypesCount})`);

    const routesCount = db.prepare('SELECT COUNT(*) as c FROM routes').get().c;
    assert(routesCount >= 5, `At least 5 routes seeded (found ${routesCount})`);

    // Verify prices are positive
    const negativePrice = db.prepare('SELECT COUNT(*) as c FROM pass_types WHERE price <= 0').get().c;
    assert(negativePrice === 0, 'All pass type prices are positive');

    // ──────────────────────────────────────
    section('3. User Registration Tests');
    // ──────────────────────────────────────

    // Register user
    const passwordHash = await bcrypt.hash('testpass123', 12);
    const regResult = db.prepare(
      'INSERT INTO users (full_name, email, password_hash, phone) VALUES (?, ?, ?, ?)'
    ).run('Test User', 'test@example.com', passwordHash, '555-1234');
    const userId = regResult.lastInsertRowid;
    assert(userId > 0, 'User registered successfully');

    // Verify password hash
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const validPw = await bcrypt.compare('testpass123', user.password_hash);
    assert(validPw === true, 'Password hash is valid');

    const invalidPw = await bcrypt.compare('wrongpassword', user.password_hash);
    assert(invalidPw === false, 'Wrong password is rejected');

    // Duplicate email should fail
    try {
      db.prepare('INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)').run('Dupe User', 'test@example.com', passwordHash);
      assert(false, 'Duplicate email should fail');
    } catch (err) {
      assert(err.message.includes('UNIQUE constraint'), 'Duplicate email rejected by UNIQUE constraint');
    }

    // ──────────────────────────────────────
    section('4. JWT Token Tests');
    // ──────────────────────────────────────

    const token = generateToken({ id: userId, email: 'test@example.com', role: 'user' });
    assert(typeof token === 'string' && token.length > 0, 'JWT token generated');

    const decoded = jwt.verify(token, process.env.TASK3_JWT_SECRET);
    assert(decoded.id === userId, 'Token contains correct user ID');
    assert(decoded.email === 'test@example.com', 'Token contains correct email');
    assert(decoded.role === 'user', 'Token contains correct role');

    // Invalid token
    try {
      jwt.verify('invalid-token', process.env.TASK3_JWT_SECRET);
      assert(false, 'Invalid token should throw');
    } catch (err) {
      assert(true, 'Invalid token rejected');
    }

    // ──────────────────────────────────────
    section('5. Pass Application Tests');
    // ──────────────────────────────────────

    const passType = db.prepare('SELECT * FROM pass_types LIMIT 1').get();
    const route = db.prepare('SELECT * FROM routes LIMIT 1').get();

    // Create application
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + passType.duration_days * 86400000).toISOString().split('T')[0];

    const appResult = db.prepare(
      "INSERT INTO pass_applications (user_id, pass_type_id, route_id, status, start_date, end_date) VALUES (?, ?, ?, 'approved', ?, ?)"
    ).run(userId, passType.id, route.id, startDate, endDate);
    const appId = appResult.lastInsertRowid;
    assert(appId > 0, 'Pass application created');

    const app = db.prepare('SELECT * FROM pass_applications WHERE id = ?').get(appId);
    assert(app.status === 'approved', 'Application status is approved');
    assert(app.user_id === userId, 'Application linked to correct user');

    // ──────────────────────────────────────
    section('6. Transaction Tests');
    // ──────────────────────────────────────

    // Server-side price validation — use server price
    const serverPrice = passType.price;
    const txnId = `TXN-TEST-001`;
    const idempotencyKey = 'test-idempotency-key-001';

    db.prepare(
      "INSERT INTO transactions (transaction_id, user_id, application_id, amount, payment_method, status, idempotency_key) VALUES (?, ?, ?, ?, ?, 'completed', ?)"
    ).run(txnId, userId, appId, serverPrice, 'card', idempotencyKey);

    const txn = db.prepare('SELECT * FROM transactions WHERE transaction_id = ?').get(txnId);
    assert(txn.amount === serverPrice, 'Transaction amount matches server-side price');
    assert(txn.status === 'completed', 'Transaction status is completed');

    // Duplicate idempotency key should fail
    try {
      db.prepare(
        "INSERT INTO transactions (transaction_id, user_id, application_id, amount, payment_method, status, idempotency_key) VALUES (?, ?, ?, ?, ?, 'completed', ?)"
      ).run('TXN-TEST-002', userId, appId, serverPrice, 'card', idempotencyKey);
      assert(false, 'Duplicate idempotency key should fail');
    } catch (err) {
      assert(err.message.includes('UNIQUE constraint'), 'Duplicate transaction prevented by idempotency key');
    }

    // Duplicate transaction_id should fail
    try {
      db.prepare(
        "INSERT INTO transactions (transaction_id, user_id, application_id, amount, payment_method, status) VALUES (?, ?, ?, ?, ?, 'completed')"
      ).run(txnId, userId, appId, serverPrice, 'card');
      assert(false, 'Duplicate transaction_id should fail');
    } catch (err) {
      assert(err.message.includes('UNIQUE constraint'), 'Duplicate transaction_id prevented');
    }

    // ──────────────────────────────────────
    section('7. Active Pass Tests');
    // ──────────────────────────────────────

    const passNumber = 'BP-TEST-001';
    db.prepare(
      "INSERT INTO active_passes (pass_number, user_id, application_id, pass_type_id, route_id, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'active')"
    ).run(passNumber, userId, appId, passType.id, route.id, startDate, endDate);

    const activePass = db.prepare('SELECT * FROM active_passes WHERE pass_number = ?').get(passNumber);
    assert(activePass.status === 'active', 'Pass is active');
    assert(activePass.user_id === userId, 'Pass linked to correct user');

    // Duplicate pass number should fail
    try {
      db.prepare(
        "INSERT INTO active_passes (pass_number, user_id, application_id, pass_type_id, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(passNumber, userId, appId, passType.id, startDate, endDate);
      assert(false, 'Duplicate pass number should fail');
    } catch (err) {
      assert(err.message.includes('UNIQUE constraint'), 'Duplicate pass number prevented');
    }

    // ──────────────────────────────────────
    section('8. Foreign Key Constraint Tests');
    // ──────────────────────────────────────

    // Application with non-existent user
    try {
      db.prepare(
        "INSERT INTO pass_applications (user_id, pass_type_id, status, start_date, end_date) VALUES (?, ?, 'pending', ?, ?)"
      ).run(99999, passType.id, startDate, endDate);
      assert(false, 'FK constraint should prevent invalid user_id');
    } catch (err) {
      assert(err.message.includes('FOREIGN KEY'), 'FK constraint prevents invalid user_id');
    }

    // ──────────────────────────────────────
    section('9. Pass Renewal (Logic Test)');
    // ──────────────────────────────────────

    // Simulate renewal by extending end_date
    const newEnd = new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0];
    db.prepare("UPDATE active_passes SET end_date = ?, status = 'active' WHERE id = ?").run(newEnd, activePass.id);
    const renewed = db.prepare('SELECT * FROM active_passes WHERE id = ?').get(activePass.id);
    assert(renewed.end_date === newEnd, 'Pass end date extended on renewal');
    assert(renewed.status === 'active', 'Pass status is active after renewal');

    // ──────────────────────────────────────
    section('10. Pricing Integrity Tests');
    // ──────────────────────────────────────

    // Verify all pass types have valid pricing
    const allTypes = db.prepare('SELECT * FROM pass_types').all();
    let pricingValid = true;
    for (const pt of allTypes) {
      if (pt.price <= 0 || pt.duration_days <= 0) {
        pricingValid = false;
      }
    }
    assert(pricingValid, 'All pass types have valid price and duration');

    // Verify student/senior discounts are less than standard
    const monthly = allTypes.find(t => t.name === 'Monthly Pass');
    const student = allTypes.find(t => t.name === 'Student Monthly');
    const senior = allTypes.find(t => t.name === 'Senior Monthly');
    if (monthly && student) {
      assert(student.price < monthly.price, 'Student pass is cheaper than standard monthly');
    }
    if (monthly && senior) {
      assert(senior.price < monthly.price, 'Senior pass is cheaper than standard monthly');
    }

    // ──────────────────────────────────────
    console.log('\n' + '═'.repeat(50));
    console.log(`Tests: ${total} | ✅ Passed: ${passed} | ❌ Failed: ${failed}`);
    console.log('═'.repeat(50));

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
})();
