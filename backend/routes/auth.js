// routes/auth.js
const express = require("express");
const bcrypt  = require("bcrypt");
const jwt     = require("jsonwebtoken");
const pool    = require("../db");
const router  = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const COOKIE_NAME = "token";

// 認証ミドルウェア（/me 用）
function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ status:"error", message:"No session" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { uid, username }
    next();
  } catch (e) {
    return res.status(401).json({ status:"error", message:"Invalid session" });
  }
}

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  const { username, password, passwordConfirm } = req.body || {};

  // 入力ログ（パスワードは出さない）
  console.log("[signup] body =", { username, hasPassword: !!password, hasConfirm: !!passwordConfirm });

  try {
    if (!username || !password || password !== passwordConfirm) {
      console.warn("[signup] invalid input");
      return res.status(400).json({ status: "error", message: "Invalid input" });
    }

    const dup = await pool.query("SELECT 1 FROM users WHERE username=$1", [username]);
    if (dup.rowCount) {
      console.warn("[signup] duplicate username");
      return res.status(409).json({ status: "error", message: "Username already taken" });
    }

    const hash = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO users (username, password_hash, type, created_at, oauth_provider, expired_at)
      VALUES ($1, $2, 'local', NOW(), NULL, NULL)
      RETURNING id, username, type, created_at, oauth_provider, expired_at
    `;
    const params = [username, hash];
    console.log("[signup] SQL =", sql.replace(/\s+/g, " "), " params=", params.map((v,i)=>`$${i+1}=${i===1?"<hash>":v}`).join(", "));
    const { rows } = await pool.query(sql, params);

    console.log("[signup] success userId=", rows[0]?.id);
    return res.status(201).json({ status: "ok", user: rows[0] });

  } catch (err) {
    // ← ここで“何が起きたか”を全部出す
    console.error("[signup] error:", {
      message: err.message,
      code: err.code,           // 例: 23505(unique), 23502(not null), 42P01(tableなし), 42703(カラムなし)
      detail: err.detail,
      constraint: err.constraint,
      table: err.table,
      column: err.column,
      stack: err.stack,
    });

    // 代表的なエラーをHTTP化
    if (err.code === "23505") return res.status(409).json({ status: "error", message: "Username already taken" });
    if (err.code === "23502") return res.status(400).json({ status: "error", message: "Missing required field" });
    if (err.code === "42P01") return res.status(500).json({ status: "error", message: "Table not found: users" });
    if (err.code === "42703") return res.status(500).json({ status: "error", message: "Column name mismatch" });

    return res.status(500).json({ status: "error", message: "Server error" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ status:"error", message:"Invalid input" });
  }
  try {
    const q = await pool.query(
      "SELECT id, username, password_hash FROM users WHERE username=$1",
      [username]
    );
    const row = q.rows[0];
    if (!row || !(await bcrypt.compare(password, row.password_hash))) {
      return res.status(401).json({ status:"error", message:"Invalid credentials" });
    }

    const token = jwt.sign({ uid: row.id, username: row.username }, JWT_SECRET, { expiresIn: "7d" });
    // FRONTEND_ORIGIN が設定されている = クロスオリジン本番環境
    const isProd = process.env.NODE_ENV === "production" || !!process.env.FRONTEND_ORIGIN;
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: isProd ? "none" : "lax",
      secure: isProd,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    return res.json({ status:"ok", user: { id: row.id, username: row.username } });
  } catch (err) {
    console.error("[login] error:", err);
    return res.status(500).json({ status:"error", message:"Server error" });
  }
});

// GET /api/auth/me（現在ログイン中のユーザー情報）
router.get("/me", requireAuth, async (req, res) => {
  // 必要なら DB で再取得。最小なら cookie の payload をそのまま返す
  return res.json({ status:"ok", user: { id: req.user.uid, username: req.user.username } });
});

// POST /api/auth/logout（Cookie 破棄）
router.post("/logout", (_req, res) => {
  const isProd = process.env.NODE_ENV === "production" || !!process.env.FRONTEND_ORIGIN;
  res.clearCookie(COOKIE_NAME, { sameSite: isProd ? "none" : "lax", secure: isProd, path: "/" });
  return res.json({ status:"ok" });
});

// PUT /api/auth/password — パスワード変更
router.put('/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword || newPassword.length < 4) {
    return res.status(400).json({ message: '入力内容を確認してください（新しいパスワードは4文字以上）' });
  }
  try {
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.uid]);
    if (!rows[0]) return res.status(404).json({ message: 'ユーザーが見つかりません' });
    const ok = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!ok) return res.status(401).json({ message: '現在のパスワードが正しくありません' });
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.uid]);
    res.json({ ok: true });
  } catch (e) {
    console.error('[PUT /api/auth/password]', e);
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

// PUT /api/auth/username — ユーザー名変更
router.put('/username', requireAuth, async (req, res) => {
  const { newUsername, currentPassword } = req.body || {};
  if (!newUsername || !currentPassword) {
    return res.status(400).json({ message: 'ユーザー名と現在のパスワードを入力してください' });
  }
  if (!/^[a-zA-Z0-9_-]{2,30}$/.test(newUsername)) {
    return res.status(400).json({ message: 'ユーザー名は2〜30文字の英数字・_・-のみ使用できます' });
  }
  try {
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.uid]);
    if (!rows[0]) return res.status(404).json({ message: 'ユーザーが見つかりません' });
    const ok = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!ok) return res.status(401).json({ message: 'パスワードが正しくありません' });
    const dup = await pool.query('SELECT 1 FROM users WHERE username = $1 AND id != $2', [newUsername, req.user.uid]);
    if (dup.rowCount) return res.status(409).json({ message: 'そのユーザー名はすでに使われています' });
    await pool.query('UPDATE users SET username = $1 WHERE id = $2', [newUsername, req.user.uid]);
    // 新しいJWTを発行してCookieを更新
    const token = jwt.sign({ uid: req.user.uid, username: newUsername }, JWT_SECRET, { expiresIn: '7d' });
    const isProd = process.env.NODE_ENV === 'production' || !!process.env.FRONTEND_ORIGIN;
    res.cookie('token', token, { httpOnly: true, sameSite: isProd ? 'none' : 'lax', secure: isProd, maxAge: 7*24*60*60*1000, path: '/' });
    res.json({ ok: true, username: newUsername });
  } catch (e) {
    console.error('[PUT /api/auth/username]', e);
    res.status(500).json({ message: 'サーバーエラー' });
  }
});

module.exports = router;
