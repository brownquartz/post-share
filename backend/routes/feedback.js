// backend/routes/feedback.js
const router = require('express').Router();
const db = require('../db');

// POST /api/feedback — 匿名OK
router.post('/', async (req, res) => {
  const message = (req.body.message || '').trim();
  if (!message) {
    return res.status(400).json({ message: 'message is required' });
  }
  await db.query(
    `INSERT INTO feedback (message) VALUES ($1)`,
    [message]
  );
  res.status(201).json({ ok: true });
});

// GET /api/feedback — ログイン必須
router.get('/', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Login required' });
  }
  const { rows } = await db.query(
    `SELECT id, message, created_at AS "createdAt" FROM feedback ORDER BY created_at DESC LIMIT 500`
  );
  res.json({ items: rows });
});

module.exports = router;
