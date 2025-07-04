// backend/server.js
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;
const dbFile = path.join(__dirname, 'posts.db');

// 追加：デフォルトキー用ラベル
const DEFAULT_KEY_LABEL = 'default';

// ミドルウェア
app.use(cors());
app.use(express.json());

// DB 接続・テーブル作成
const db = new sqlite3.Database(dbFile, (err) => {
  if (err) return console.error(err);
  console.log('Connected to SQLite database.');
});
db.run(`
  CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    content TEXT NOT NULL
  )
`);

// POST /api/posts
app.post('/api/posts', (req, res) => {
  const { id, content } = req.body;
  const defaultKey = generateRandomString(12); // ランダム生成してもOK

  // トランザクション的に２つの INSERT
  db.serialize(() => {
    db.run(
      'INSERT INTO posts(id, content) VALUES (?, ?)',
      [id, content],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });

        db.run(
          'INSERT INTO access_keys(post_id, label, password) VALUES (?, ?, ?)',
          [id, DEFAULT_KEY_LABEL, defaultKey],
          function(err2) {
            if (err2) return res.status(500).json({ error: err2.message });
            // クライアントに初期パスワードを返す
            res.json({ defaultKey });
          }
        );
      }
    );
  });
});

// POST /api/posts/:postId/keys
app.post('/api/posts/:postId/keys', (req, res) => {
  const postId = req.params.postId;
  const { label, password } = req.body;

  db.run(
    'INSERT INTO access_keys(post_id, label, password) VALUES (?, ?, ?)',
    [postId, label, password],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// GET /api/posts/:postId
app.get('/api/posts/:postId', (req, res) => {
  const postId = req.params.postId;
  const password = req.query.password;

  db.get(
    `SELECT p.content
     FROM posts p
     JOIN access_keys k
       ON p.id = k.post_id
     WHERE p.id = ? AND k.password = ?`,
    [postId, password],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(401).json({ error: 'Invalid ID or password' });
      res.json({ content: row.content });
    }
  );
});

// サーバ起動
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
