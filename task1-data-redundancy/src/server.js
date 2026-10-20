/**
 * Task 1 — Data Redundancy Removal System
 * Express server with REST API and web dashboard
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const { getDb } = require('./database');
const { processRecord, validateRecord } = require('./dedup-engine');

const app = express();
const PORT = process.env.TASK1_PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

let db;
try {
  db = getDb();
  console.log('[Task 1] Database initialized');
} catch (err) {
  console.error('[Task 1] Database initialization failed:', err.message);
  process.exit(1);
}

// ── Health check ─────────────────────────────
app.get('/api/health', (req, res) => {
  try {
    db.prepare('SELECT 1').get();
    res.json({ status: 'healthy', service: 'data-redundancy-removal', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', error: err.message });
  }
});

// ── Process incoming record ──────────────────
app.post('/api/records', (req, res) => {
  try {
    const result = processRecord(db, req.body);
    const statusCode = result.success ? 201 : 409;
    res.status(statusCode).json(result);
  } catch (err) {
    console.error('[Task 1] Error processing record:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── Validate record (without inserting) ──────
app.post('/api/records/validate', (req, res) => {
  try {
    const validation = validateRecord(req.body);
    res.json(validation);
  } catch (err) {
    res.status(500).json({ valid: false, errors: ['Server error during validation'] });
  }
});

// ── Get all records ──────────────────────────
app.get('/api/records', (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const records = db.prepare('SELECT * FROM records ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
    const total = db.prepare('SELECT COUNT(*) as count FROM records').get().count;

    res.json({
      records,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch records' });
  }
});

// ── Get single record ────────────────────────
app.get('/api/records/:id', (req, res) => {
  try {
    const record = db.prepare('SELECT * FROM records WHERE id = ?').get(req.params.id);
    if (!record) return res.status(404).json({ error: 'Record not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch record' });
  }
});

// ── Delete a record ──────────────────────────
app.delete('/api/records/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM records WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Record not found' });
    res.json({ success: true, message: 'Record deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete record' });
  }
});

// ── Get redundancy log ───────────────────────
app.get('/api/logs', (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const type = req.query.type; // filter by match_type

    let query = 'SELECT * FROM redundancy_log';
    let countQuery = 'SELECT COUNT(*) as count FROM redundancy_log';
    const params = [];
    const countParams = [];

    if (type) {
      query += ' WHERE match_type = ?';
      countQuery += ' WHERE match_type = ?';
      params.push(type);
      countParams.push(type);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const logs = db.prepare(query).all(...params);
    const total = db.prepare(countQuery).all(...countParams)[0]?.count || 0;

    res.json({
      logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// ── Dashboard stats ──────────────────────────
app.get('/api/stats', (req, res) => {
  try {
    const totalRecords = db.prepare('SELECT COUNT(*) as count FROM records').get().count;
    const totalLogs = db.prepare('SELECT COUNT(*) as count FROM redundancy_log').get().count;
    const duplicatesBlocked = db.prepare("SELECT COUNT(*) as count FROM redundancy_log WHERE match_type = 'exact_duplicate'").get().count;
    const fuzzyBlocked = db.prepare("SELECT COUNT(*) as count FROM redundancy_log WHERE match_type = 'fuzzy_match'").get().count;
    const falsePositives = db.prepare("SELECT COUNT(*) as count FROM redundancy_log WHERE match_type = 'false_positive'").get().count;
    const uniqueInserted = db.prepare("SELECT COUNT(*) as count FROM redundancy_log WHERE match_type = 'unique'").get().count;

    res.json({
      totalRecords,
      totalProcessed: totalLogs,
      duplicatesBlocked,
      fuzzyBlocked,
      falsePositives,
      uniqueInserted
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ── Bulk import ──────────────────────────────
app.post('/api/records/bulk', (req, res) => {
  try {
    if (!Array.isArray(req.body.records)) {
      return res.status(400).json({ error: 'Request body must contain a "records" array' });
    }

    const results = req.body.records.map(record => processRecord(db, record));

    const summary = {
      total: results.length,
      inserted: results.filter(r => r.success).length,
      rejected: results.filter(r => !r.success).length,
      results
    };

    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: 'Bulk import failed' });
  }
});

// ── Serve frontend ───────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ── Start server ─────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[Task 1] Data Redundancy Removal System running on http://localhost:${PORT}`);
  });
}

module.exports = app;
