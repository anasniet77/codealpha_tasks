/**
 * Task 3 — Cloud-Based Bus Pass System
 * Express server
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const { getDb } = require('./models/database');
const createAuthRoutes = require('./routes/auth');
const createPassRoutes = require('./routes/passes');

const app = express();
const PORT = process.env.TASK3_PORT || 3003;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

let db;
try {
  db = getDb();
  console.log('[Task 3] Database initialized');
} catch (err) {
  console.error('[Task 3] Database initialization failed:', err.message);
  process.exit(1);
}

// ── Health check ─────────────────────────
app.get('/api/health', (req, res) => {
  try {
    db.prepare('SELECT 1').get();
    res.json({ status: 'healthy', service: 'bus-pass-system', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', error: err.message });
  }
});

// ── Routes ───────────────────────────────
app.use('/api/auth', createAuthRoutes(db));
app.use('/api/passes', createPassRoutes(db));

// ── Public info endpoint (no auth) ──────
app.get('/api/info', (req, res) => {
  const passTypes = db.prepare('SELECT id, name, description, duration_days, price FROM pass_types WHERE is_active = 1').all();
  const routes = db.prepare('SELECT id, route_number, origin, destination, stops FROM routes WHERE is_active = 1').all();
  res.json({ passTypes, routes });
});

// ── Serve frontend ───────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[Task 3] Cloud-Based Bus Pass System running on http://localhost:${PORT}`);
  });
}

module.exports = app;
