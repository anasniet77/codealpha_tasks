/**
 * Task 3 — Auth Routes (Register / Login)
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../middleware/auth');

function createAuthRoutes(db) {
  const router = express.Router();

  // ── Register ────────────────────────────
  router.post('/register', async (req, res) => {
    try {
      const { full_name, email, password, phone, address } = req.body;

      // Validation
      if (!full_name || !email || !password) {
        return res.status(400).json({ error: 'Full name, email, and password are required' });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      // Check existing
      const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email);
      if (existing) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      // Hash password and insert
      const passwordHash = await bcrypt.hash(password, 12);
      const result = db.prepare(
        'INSERT INTO users (full_name, email, password_hash, phone, address) VALUES (?, ?, ?, ?, ?)'
      ).run(full_name.trim(), email.trim().toLowerCase(), passwordHash, phone || null, address || null);

      const user = db.prepare('SELECT id, full_name, email, role FROM users WHERE id = ?').get(result.lastInsertRowid);
      const token = generateToken(user);

      res.status(201).json({
        message: 'Registration successful',
        user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role },
        token
      });
    } catch (err) {
      console.error('Registration error:', err);
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  // ── Login ───────────────────────────────
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = generateToken(user);

      res.json({
        message: 'Login successful',
        user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role },
        token
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // ── Get current user ────────────────────
  router.get('/me', require('../middleware/auth').authMiddleware, (req, res) => {
    const user = db.prepare('SELECT id, full_name, email, phone, address, role, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  });

  return router;
}

module.exports = createAuthRoutes;
