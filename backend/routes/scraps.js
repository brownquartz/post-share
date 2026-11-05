const router = require('express').Router();
const db = require('../db');
const { queryCatch } = require('../utils/routeTools');

router.use((req, res, next) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: 'Login required' });
  }
  next();
});

// GET /api/scraps/mine
router.get('/mine', queryCatch('GET /api/scraps/mine', async (req, res) => {
  const userId = Number(req.user.id);
  const { rows } = await db.query(
    `SELECT s.post_password AS "postPassword",
            p.id, p.title, p.content, p.post_id AS "postStringId",
            p.view_policy AS "viewPolicy",
            p.created_at AS "createdAt", p.expires_at AS "expiresAt"
       FROM scraps s
       JOIN posts p ON p.id = s.post_id
      WHERE s.user_id = $1
        AND (p.expires_at IS NULL OR p.expires_at > now())
      ORDER BY s.created_at DESC
      LIMIT 200`,
    [userId]
  );
  res.json({
    items: rows.map(r => ({
      id: r.id,
      postStringId: r.postStringId,
      title: r.title,
      content: r.content,
      viewPolicy: r.viewPolicy,
      postPassword: r.postPassword,
      createdAt: r.createdAt,
      expiresAt: r.expiresAt,
    })),
  });
}));

// POST /api/scraps  { postId: number, postPassword?: string }
router.post('/', queryCatch('POST /api/scraps', async (req, res) => {
  const userId = Number(req.user.id);
  const postId = Number(req.body.postId);
  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json({ message: 'postId must be a positive integer' });
  }
  const postPassword = req.body.postPassword || null;

  await db.query(
    `INSERT INTO scraps (user_id, post_id, post_password)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, post_id)
     DO UPDATE SET post_password = EXCLUDED.post_password`,
    [userId, postId, postPassword]
  );
  res.json({ ok: true });
}));

// DELETE /api/scraps/:postId
router.delete('/:postId', queryCatch('DELETE /api/scraps/:postId', async (req, res) => {
  const userId = Number(req.user.id);
  const postId = Number(req.params.postId);
  await db.query(
    `DELETE FROM scraps WHERE user_id = $1 AND post_id = $2`,
    [userId, postId]
  );
  res.json({ ok: true });
}));

module.exports = router;
