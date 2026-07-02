// backend/routes/notifications.js
const router = require('express').Router();
const db = require('../db');

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Login required' });
  next();
}

// お知らせ一覧（未読数つき）
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, type, data, is_read AS "isRead", created_at AS "createdAt"
       FROM notifications WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    const unreadCount = rows.filter(r => !r.isRead).length;
    res.json({ items: rows, unreadCount });
  } catch (e) {
    console.error('[GET /api/notifications]', e);
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

// 全て既読にする
router.put('/read', requireAuth, async (req, res) => {
  try {
    await db.query(
      `UPDATE notifications SET is_read = TRUE WHERE user_id = $1`,
      [req.user.id]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('[PUT /api/notifications/read]', e);
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

module.exports = router;
