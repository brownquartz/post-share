// backend/routes/friends.js
const router = require('express').Router();
const db = require('../db');

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Login required' });
  next();
}

// 友だち申請を送る（username 指定）
router.post('/request', requireAuth, async (req, res) => {
  try {
    const fromId = Number(req.user.id);
    const { username } = req.body;
    if (!username) return res.status(400).json({ message: 'username is required' });

    const { rows: users } = await db.query('SELECT id FROM users WHERE username = $1', [username]);
    if (users.length === 0) return res.status(404).json({ message: 'ユーザーが見つかりません' });
    const toId = Number(users[0].id);

    if (fromId === toId) return res.status(400).json({ message: '自分自身には申請できません' });

    const { rows: existing } = await db.query(
      `SELECT id, status FROM friendships
       WHERE (from_user_id = $1 AND to_user_id = $2) OR (from_user_id = $2 AND to_user_id = $1)`,
      [fromId, toId]
    );
    if (existing.length > 0) {
      const s = existing[0].status;
      if (s === 'accepted') return res.status(409).json({ message: 'すでに友だちです' });
      return res.status(409).json({ message: '申請済みまたは受信中です' });
    }

    const { rows } = await db.query(
      `INSERT INTO friendships (from_user_id, to_user_id, status) VALUES ($1, $2, 'pending') RETURNING id`,
      [fromId, toId]
    );

    await db.query(
      `INSERT INTO notifications (user_id, type, data) VALUES ($1, 'friend_request', $2)`,
      [toId, JSON.stringify({ fromUsername: req.user.username, friendshipId: rows[0].id })]
    );

    res.status(201).json({ ok: true });
  } catch (e) {
    console.error('[POST /api/friends/request]', e);
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

// 受信した申請一覧
router.get('/requests', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT f.id, f.status, f.created_at AS "createdAt", u.username AS "fromUsername"
       FROM friendships f
       JOIN users u ON u.id = f.from_user_id
       WHERE f.to_user_id = $1 AND f.status = 'pending'
       ORDER BY f.created_at DESC`,
      [req.user.id]
    );
    res.json({ items: rows });
  } catch (e) {
    console.error('[GET /api/friends/requests]', e);
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

// 友だち一覧
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT f.id, u.username, u.id AS "userId"
       FROM friendships f
       JOIN users u ON u.id = CASE WHEN f.from_user_id = $1 THEN f.to_user_id ELSE f.from_user_id END
       WHERE (f.from_user_id = $1 OR f.to_user_id = $1) AND f.status = 'accepted'
       ORDER BY u.username`,
      [req.user.id]
    );
    res.json({ items: rows });
  } catch (e) {
    console.error('[GET /api/friends]', e);
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

// 申請を承認
router.put('/:id/accept', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE friendships SET status = 'accepted'
       WHERE id = $1 AND to_user_id = $2 AND status = 'pending'
       RETURNING id, from_user_id`,
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Not found' });

    await db.query(
      `INSERT INTO notifications (user_id, type, data) VALUES ($1, 'friend_accepted', $2)`,
      [rows[0].from_user_id, JSON.stringify({ byUsername: req.user.username })]
    );

    res.json({ ok: true });
  } catch (e) {
    console.error('[PUT /api/friends/:id/accept]', e);
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

// 申請を拒否
router.put('/:id/reject', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE friendships SET status = 'rejected'
       WHERE id = $1 AND to_user_id = $2 AND status = 'pending'
       RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    console.error('[PUT /api/friends/:id/reject]', e);
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

// 友だち解除
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `DELETE FROM friendships
       WHERE id = $1 AND (from_user_id = $2 OR to_user_id = $2)
       RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    console.error('[DELETE /api/friends/:id]', e);
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

// 友だちの投稿フィード
const FEED_PAGE_SIZE = 20;
router.get('/feed', requireAuth, async (req, res) => {
  try {
    const offset = Math.max(0, parseInt(req.query.offset) || 0);
    const { rows } = await db.query(
      `SELECT p.id, p.title, p.post_id AS "postId", p.view_policy AS "viewPolicy",
              p.created_at AS "createdAt", u.username AS "ownerUsername"
       FROM posts p
       JOIN users u ON u.id = p.owner_user_id
       JOIN friendships f ON (
         (f.from_user_id = $1 AND f.to_user_id = p.owner_user_id) OR
         (f.to_user_id   = $1 AND f.from_user_id = p.owner_user_id)
       )
       WHERE f.status = 'accepted'
         AND p.view_policy IN ('public_open', 'friends')
         AND (p.expires_at IS NULL OR p.expires_at > NOW())
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, FEED_PAGE_SIZE + 1, offset]
    );
    const hasMore = rows.length > FEED_PAGE_SIZE;
    res.json({ items: rows.slice(0, FEED_PAGE_SIZE), hasMore });
  } catch (e) {
    console.error('[GET /api/friends/feed]', e);
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

// ユーザーとの関係状態確認（username 指定）
router.get('/status/:username', requireAuth, async (req, res) => {
  try {
    const { rows: users } = await db.query('SELECT id FROM users WHERE username = $1', [req.params.username]);
    if (users.length === 0) return res.json({ status: 'none' });
    const otherId = Number(users[0].id);
    const myId = Number(req.user.id);
    if (myId === otherId) return res.json({ status: 'self' });

    const { rows } = await db.query(
      `SELECT id, status, from_user_id FROM friendships
       WHERE (from_user_id = $1 AND to_user_id = $2) OR (from_user_id = $2 AND to_user_id = $1)`,
      [myId, otherId]
    );
    if (rows.length === 0) return res.json({ status: 'none' });
    const f = rows[0];
    if (f.status === 'accepted') return res.json({ status: 'accepted', friendshipId: f.id });
    if (f.status === 'pending') {
      return res.json({
        status: Number(f.from_user_id) === myId ? 'pending_sent' : 'pending_received',
        friendshipId: f.id,
      });
    }
    return res.json({ status: f.status });
  } catch (e) {
    console.error('[GET /api/friends/status/:username]', e);
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

// 特定ユーザーの投稿（自分が見られるもの）
router.get('/user/:username', requireAuth, async (req, res) => {
  try {
    const myId = Number(req.user.id);
    const { rows: users } = await db.query('SELECT id FROM users WHERE username = $1', [req.params.username]);
    if (users.length === 0) return res.status(404).json({ message: 'ユーザーが見つかりません' });
    const targetId = Number(users[0].id);

    // 友だち関係を確認
    const { rows: fRows } = await db.query(
      `SELECT id FROM friendships
       WHERE ((from_user_id = $1 AND to_user_id = $2) OR (from_user_id = $2 AND to_user_id = $1))
         AND status = 'accepted'`,
      [myId, targetId]
    );
    const isFriend = fRows.length > 0;

    const { rows } = await db.query(
      `SELECT p.id, p.title, p.post_id AS "postId", p.view_policy AS "viewPolicy", p.created_at AS "createdAt"
       FROM posts p
       WHERE p.owner_user_id = $1
         AND (p.expires_at IS NULL OR p.expires_at > NOW())
         AND (
           p.view_policy = 'public_open'
           OR (p.view_policy = 'friends' AND $2)
           OR (p.owner_user_id = $3)
         )
       ORDER BY p.created_at DESC
       LIMIT 50`,
      [targetId, isFriend, myId]
    );
    res.json({ items: rows, isFriend });
  } catch (e) {
    console.error('[GET /api/friends/user/:username]', e);
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

module.exports = router;
