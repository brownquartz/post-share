// backend/routes/feedback.js
const router = require('express').Router();
const db = require('../db');

// POST /api/feedback — 匿名OK、送信後に view_token を返す
router.post('/', async (req, res) => {
  try {
    const title   = (req.body.title   || '').trim();
    const message = (req.body.message || '').trim();
    const email   = (req.body.email   || '').trim() || null;
    if (!title && !message) return res.status(400).json({ message: 'タイトルか内容のどちらかを入力してください' });

    const { rows } = await db.query(
      `INSERT INTO feedback (title, message, email) VALUES ($1, $2, $3)
       RETURNING id, view_token AS "viewToken"`,
      [title, message, email]
    );
    res.status(201).json({ ok: true, id: rows[0].id, viewToken: rows[0].viewToken });
  } catch (e) {
    console.error('[POST /api/feedback]', e);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// GET /api/feedback/view/:token — 送信者が自分のお問い合わせを確認
router.get('/view/:token', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, title, message, email, status, reply, replied_at AS "repliedAt", created_at AS "createdAt"
         FROM feedback WHERE view_token = $1`,
      [req.params.token]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    console.error('[GET /api/feedback/view]', e);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'park';
function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Login required' });
  if (req.user.username !== ADMIN_USERNAME) return res.status(403).json({ message: 'Forbidden' });
  next();
}

// GET /api/feedback — 管理者のみ
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, title, message, email, status, reply, replied_at AS "repliedAt", created_at AS "createdAt"
         FROM feedback ORDER BY created_at DESC LIMIT 500`
    );
    res.json({ items: rows });
  } catch (e) {
    console.error('[GET /api/feedback]', e);
    res.status(500).json({ message: 'サーバーエラーが発生しました。DBマイグレーションが必要な可能性があります。' });
  }
});

// PUT /api/feedback/:id — 管理者が返信・ステータス更新
router.put('/:id', requireAdmin, async (req, res) => {
  try {
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
  } catch (e) {
    console.error('[PUT /api/feedback]', e);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

module.exports = router;
