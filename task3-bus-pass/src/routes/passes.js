/**
 * Task 3 — Pass application, booking, renewal, and transaction routes
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

function createPassRoutes(db) {
  const router = express.Router();

  // All pass routes require authentication
  router.use(authMiddleware);

  // ── Get available pass types ────────────
  router.get('/types', (req, res) => {
    const types = db.prepare('SELECT * FROM pass_types WHERE is_active = 1').all();
    res.json(types);
  });

  // ── Get available routes ────────────────
  router.get('/routes', (req, res) => {
    const routes = db.prepare('SELECT * FROM routes WHERE is_active = 1').all();
    res.json(routes);
  });

  // ── Apply for a pass ────────────────────
  router.post('/apply', (req, res) => {
    try {
      const { pass_type_id, route_id, payment_method, idempotency_key } = req.body;
      const userId = req.user.id;

      if (!pass_type_id) {
        return res.status(400).json({ error: 'pass_type_id is required' });
      }

      // Validate pass type exists
      const passType = db.prepare('SELECT * FROM pass_types WHERE id = ? AND is_active = 1').get(pass_type_id);
      if (!passType) {
        return res.status(404).json({ error: 'Pass type not found or inactive' });
      }

      // Validate route if provided
      if (route_id) {
        const route = db.prepare('SELECT * FROM routes WHERE id = ? AND is_active = 1').get(route_id);
        if (!route) {
          return res.status(404).json({ error: 'Route not found or inactive' });
        }
      }

      // Idempotency check — prevent duplicate transactions
      if (idempotency_key) {
        const existingTx = db.prepare('SELECT * FROM transactions WHERE idempotency_key = ?').get(idempotency_key);
        if (existingTx) {
          const existingApp = db.prepare('SELECT * FROM pass_applications WHERE id = ?').get(existingTx.application_id);
          return res.status(200).json({
            message: 'Duplicate request — returning existing transaction',
            application: existingApp,
            transaction: { id: existingTx.transaction_id, amount: existingTx.amount, status: existingTx.status }
          });
        }
      }

      // Server-side price validation — use server price, not client-provided price
      const serverPrice = passType.price;

      // Calculate dates
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + passType.duration_days);

      // Transaction — insert application + transaction atomically
      const transact = db.transaction(() => {
        // Insert application
        const appResult = db.prepare(
          `INSERT INTO pass_applications (user_id, pass_type_id, route_id, status, start_date, end_date)
           VALUES (?, ?, ?, 'approved', ?, ?)`
        ).run(userId, pass_type_id, route_id || null, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]);

        const applicationId = appResult.lastInsertRowid;
        const transactionId = `TXN-${uuidv4().substring(0, 8).toUpperCase()}`;

        // Insert transaction
        db.prepare(
          `INSERT INTO transactions (transaction_id, user_id, application_id, amount, payment_method, status, idempotency_key)
           VALUES (?, ?, ?, ?, ?, 'completed', ?)`
        ).run(transactionId, userId, applicationId, serverPrice, payment_method || 'card', idempotency_key || null);

        // Issue pass
        const passNumber = `BP-${uuidv4().substring(0, 12).toUpperCase()}`;
        db.prepare(
          `INSERT INTO active_passes (pass_number, user_id, application_id, pass_type_id, route_id, start_date, end_date, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`
        ).run(passNumber, userId, applicationId, pass_type_id, route_id || null, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]);

        return {
          application_id: applicationId,
          transaction_id: transactionId,
          pass_number: passNumber,
          amount: serverPrice,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        };
      });

      const result = transact();

      res.status(201).json({
        message: 'Pass application approved and issued',
        ...result
      });
    } catch (err) {
      console.error('Application error:', err);
      res.status(500).json({ error: 'Failed to process application' });
    }
  });

  // ── Get my applications ─────────────────
  router.get('/my-applications', (req, res) => {
    const apps = db.prepare(`
      SELECT pa.*, pt.name as pass_type_name, pt.price,
             r.route_number, r.origin, r.destination
      FROM pass_applications pa
      JOIN pass_types pt ON pa.pass_type_id = pt.id
      LEFT JOIN routes r ON pa.route_id = r.id
      WHERE pa.user_id = ?
      ORDER BY pa.created_at DESC
    `).all(req.user.id);
    res.json(apps);
  });

  // ── Get my active passes ────────────────
  router.get('/my-passes', (req, res) => {
    const passes = db.prepare(`
      SELECT ap.*, pt.name as pass_type_name,
             r.route_number, r.origin, r.destination
      FROM active_passes ap
      JOIN pass_types pt ON ap.pass_type_id = pt.id
      LEFT JOIN routes r ON ap.route_id = r.id
      WHERE ap.user_id = ?
      ORDER BY ap.created_at DESC
    `).all(req.user.id);

    // Update expired passes
    const today = new Date().toISOString().split('T')[0];
    passes.forEach(p => {
      if (p.status === 'active' && p.end_date < today) {
        db.prepare("UPDATE active_passes SET status = 'expired' WHERE id = ?").run(p.id);
        p.status = 'expired';
      }
    });

    res.json(passes);
  });

  // ── Get my transactions ─────────────────
  router.get('/my-transactions', (req, res) => {
    const txns = db.prepare(`
      SELECT t.*, pt.name as pass_type_name
      FROM transactions t
      JOIN pass_applications pa ON t.application_id = pa.id
      JOIN pass_types pt ON pa.pass_type_id = pt.id
      WHERE t.user_id = ?
      ORDER BY t.created_at DESC
    `).all(req.user.id);
    res.json(txns);
  });

  // ── Renew a pass ────────────────────────
  router.post('/renew/:passId', (req, res) => {
    try {
      const pass = db.prepare('SELECT * FROM active_passes WHERE id = ? AND user_id = ?').get(req.params.passId, req.user.id);
      if (!pass) {
        return res.status(404).json({ error: 'Pass not found' });
      }

      const passType = db.prepare('SELECT * FROM pass_types WHERE id = ?').get(pass.pass_type_id);
      if (!passType) {
        return res.status(404).json({ error: 'Pass type no longer available' });
      }

      const { idempotency_key, payment_method } = req.body;

      // Idempotency check
      if (idempotency_key) {
        const existingTx = db.prepare('SELECT * FROM transactions WHERE idempotency_key = ?').get(idempotency_key);
        if (existingTx) {
          return res.status(200).json({ message: 'Duplicate renewal request — already processed' });
        }
      }

      const serverPrice = passType.price;

      const transact = db.transaction(() => {
        // New dates from today or from pass expiry (whichever is later)
        const today = new Date();
        const currentEnd = new Date(pass.end_date);
        const newStart = currentEnd > today ? currentEnd : today;
        const newEnd = new Date(newStart);
        newEnd.setDate(newEnd.getDate() + passType.duration_days);

        // Create new application for renewal
        const appResult = db.prepare(
          `INSERT INTO pass_applications (user_id, pass_type_id, route_id, status, start_date, end_date)
           VALUES (?, ?, ?, 'approved', ?, ?)`
        ).run(req.user.id, pass.pass_type_id, pass.route_id, newStart.toISOString().split('T')[0], newEnd.toISOString().split('T')[0]);

        const transactionId = `TXN-${uuidv4().substring(0, 8).toUpperCase()}`;

        db.prepare(
          `INSERT INTO transactions (transaction_id, user_id, application_id, amount, payment_method, status, idempotency_key)
           VALUES (?, ?, ?, ?, ?, 'completed', ?)`
        ).run(transactionId, req.user.id, appResult.lastInsertRowid, serverPrice, payment_method || 'card', idempotency_key || null);

        // Update existing pass with new dates
        db.prepare(
          "UPDATE active_passes SET end_date = ?, status = 'active', application_id = ? WHERE id = ?"
        ).run(newEnd.toISOString().split('T')[0], appResult.lastInsertRowid, pass.id);

        return {
          transaction_id: transactionId,
          amount: serverPrice,
          new_end_date: newEnd.toISOString().split('T')[0]
        };
      });

      const result = transact();
      res.json({ message: 'Pass renewed successfully', ...result });
    } catch (err) {
      console.error('Renewal error:', err);
      res.status(500).json({ error: 'Failed to renew pass' });
    }
  });

  // ── Admin: Get all applications ─────────
  router.get('/admin/applications', adminMiddleware, (req, res) => {
    const apps = db.prepare(`
      SELECT pa.*, u.full_name, u.email, pt.name as pass_type_name
      FROM pass_applications pa
      JOIN users u ON pa.user_id = u.id
      JOIN pass_types pt ON pa.pass_type_id = pt.id
      ORDER BY pa.created_at DESC
    `).all();
    res.json(apps);
  });

  // ── Admin: Update application status ────
  router.patch('/admin/applications/:id', adminMiddleware, (req, res) => {
    const { status } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    db.prepare('UPDATE pass_applications SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);
    res.json({ message: 'Application status updated' });
  });

  return router;
}

module.exports = createPassRoutes;
