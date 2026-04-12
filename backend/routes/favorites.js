const router = require('express').Router();
const db = require('../db');

router.use((req, res, next) => {
  // ここで確実にブロック（attachAuthOptional が付いていなくても守れる）
  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: 'Login required' });
  }
  next();
});

// POST /api/favorites  { postId:number }
router.post('/', async (req, res) => {
  const userId = Number(req.user.id);
  const postId = Number(req.body.postId);
  if (!Number.isInteger(postId)) {
    return res.status(400).json({ message: 'postId must be an integer (posts.id)' });
  }
  await db.query(
    `INSERT INTO favorites (user_id, post_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
    [userId, postId]
  );
  res.json({ ok: true });
});

// DELETE /api/favorites/:postId
router.delete('/:postId', async (req, res) => {
  const userId = Number(req.user.id);
  const postId = Number(req.params.postId);
  await db.query(`DELETE FROM favorites WHERE user_id=$1 AND post_id=$2`, [userId, postId]);
  res.json({ ok: true });
});

// GET /api/favorites/mine
router.get('/mine', async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const { rows } = await db.query(
      `SELECT p.*, TRUE AS is_favorited
         FROM favorites f
         JOIN posts p ON p.id=f.post_id
        WHERE f.user_id=$1
          AND (p.expires_at IS NULL OR p.expires_at > now())
        ORDER BY f.created_at DESC
        LIMIT 200`,
      [userId]
    );
    res.json({
      items: rows.map(r => ({
        id: r.id,
        postId: r.post_id,
        title: r.title,
        viewPolicy: r.view_policy,
        createdAt: r.created_at,
        isFavorited: true,
        canView: true,
      })),
    });
  } catch (e) {
    console.error('[favorites/mine] error:', e);
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
