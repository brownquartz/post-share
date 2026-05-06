// backend/routes/feedback.js
const router = require('express').Router();
const db = require('../db');

// POST /api/feedback — 匿名OK、送信後に view_token を返す
router.post('/', async (req, res) => {
  const message = (req.body.message || '').trim();
  if (!message) return res.status(400).json({ message: 'message is required' });

  const { rows } = await db.query(
    `INSERT INTO feedback (message) VALUES ($1)
     RETURNING id, view_token AS "viewToken"`,
    [message]
  );
  res.status(201).json({ ok: true, id: rows[0].id, viewToken: rows[0].viewToken });
});

// GET /api/feedback/view/:token — 送信者が自分の意見を確認
router.get('/view/:token', async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, message, status, reply, replied_at AS "repliedAt", created_at AS "createdAt"
       FROM feedback WHERE view_token = $1`,
    [req.params.token]
  );
  if (rows.length === 0) return res.status(404).json({ message: 'Not found' });
  res.json(rows[0]);
});

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'park';
function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Login required' });
  if (req.user.username !== ADMIN_USERNAME) return res.status(403).json({ message: 'Forbidden' });
  next();
}

// GET /api/feedback — 管理者のみ
router.get('/', requireAdmin, async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, message, status, reply, replied_at AS "repliedAt", created_at AS "createdAt"
       FROM feedback ORDER BY created_at DESC LIMIT 500`
  );
  res.json({ items: rows });
});

// PUT /api/feedback/:id — 管理者が返信・ステータス更新
router.put('/:id', requireAdmin, async (req, res) => {
  const { reply, status } = req.body;
  const validStatuses = ['未回答', '保留', '回答済み'];
  if (status && !validStatuses.includes(status))
    return res.status(400).json({ message: 'Invalid status' });

  const { rows } = await db.query(
    `UPDATE feedback
        SET reply      = COALESCE($1, reply),
            status     = COALESCE($2, status),
            replied_at = CASE WHEN $1 IS NOT NULL THEN NOW() ELSE replied_at END
      WHERE id = $3
      RETURNING id, message, status, reply, replied_at AS "repliedAt", created_at AS "createdAt"`,
    [reply ?? null, status ?? null, req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ message: 'Not found' });
  res.json(rows[0]);
});

module.exports = router;
