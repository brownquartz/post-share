// backend/routes/comments.js
const express = require("express");
const router = express.Router({ mergeParams: true }); // keep :id from parent
const pool = require("../db");

const {
  parseIntParam,
  requireBodyFields,
  queryCatch,
  beforeProcess,
} = require("../utils/routeTools");

const {
  getFlags,
  canView,
  canCommentCreate,
  canCommentModerate,
} = require("../utils/policy");

// ---- helpers ---------------------------------------------------------------

async function getPostById(postId) {
  const q = await pool.query(
    `SELECT id,
            -- new names
            post_id,
            post_password_hash,
            owner_user_id,
            view_policy,
            edit_policy,
            delete_policy,
            comment_create_policy,
            comment_moderate_policy
       FROM posts
      WHERE id = $1`,
    [postId]
  );
  return q.rows[0] || null;
}

function takeString(v, maxLen) {
  const s = (v ?? "").toString();
  return maxLen ? s.slice(0, maxLen) : s;
}

// ---- routes ----------------------------------------------------------------

/**
 * GET /api/posts/:id/comments
 * 読める人だけがコメント一覧を取得（view_policy に従う）
 * クエリは postId/postPassword 優先、無ければ accountId/password を受理
 */
router.get(
  "/",
  beforeProcess(parseIntParam("id")),
  queryCatch("GET /api/posts/:id/comments", async (req, res) => {
    const postId = req.params.id;
    const post = await getPostById(postId);
    if (!post) {
      return res.status(404).json({ status: "error", message: "Not found" });
    }

    const postIdQ = (req.query.postId ?? req.query.accountId ?? "").toString().trim();
    const postPwQ = req.query.postPassword ?? req.query.password ?? "";

    const flags = getFlags(req, post, { postId: postIdQ, postPassword: postPwQ });
    if (!canView(post, flags)) {
      return res.status(401).json({ status: "error", message: "Unauthorized" });
    }

    const { rows } = await pool.query(
      `SELECT id, name, content, created_at AS "createdAt"
         FROM comments
        WHERE post_id = $1
        ORDER BY created_at ASC`,
      [postId]
    );
    return res.json(rows);
  })
);

/**
 * POST /api/posts/:id/comments
 * コメント作成（comment_create_policy に従う）
 * body: { content: string, name?: string }
 * クエリは postId/postPassword 優先、無ければ accountId/password を受理
 */
router.post(
  "/",
  beforeProcess(parseIntParam("id"), requireBodyFields(["content"])),
  queryCatch("POST /api/posts/:id/comments", async (req, res) => {
    const postId = req.params.id;
    const post = await getPostById(postId);
    if (!post) {
      return res.status(404).json({ status: "error", message: "Not found" });
    }

    const postIdQ = (req.query.postId ?? req.query.accountId ?? "").toString().trim();
    const postPwQ = req.query.postPassword ?? req.query.password ?? "";

    const flags = getFlags(req, post, { postId: postIdQ, postPassword: postPwQ });
    if (!canCommentCreate(post, flags)) {
      return res.status(401).json({ status: "error", message: "Unauthorized" });
    }

    const name = takeString(req.body.name, 64) || null;
    const content = takeString(req.body.content, 2000);

    const { rows } = await pool.query(
      `INSERT INTO comments (post_id, user_id, name, content)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, content, created_at AS "createdAt"`,
      [postId, flags.userId ?? null, name, content]
    );

    return res.status(201).json(rows[0]);
  })
);

/**
 * DELETE /api/posts/:id/comments/:commentId
 * コメントの削除（comment_moderate_policy に従う）
 * クエリは postId/postPassword 優先、無ければ accountId/password を受理
 */
router.delete(
  "/:commentId",
  beforeProcess(parseIntParam("id"), parseIntParam("commentId")),
  queryCatch("DELETE /api/posts/:id/comments/:commentId", async (req, res) => {
    const postId = req.params.id;
    const commentId = req.params.commentId;

    const post = await getPostById(postId);
    if (!post) {
      return res.status(404).json({ status: "error", message: "Not found" });
    }

    const postIdQ = (req.query.postId ?? req.query.accountId ?? "").toString().trim();
    const postPwQ = req.query.postPassword ?? req.query.password ?? "";

    const flags = getFlags(req, post, { postId: postIdQ, postPassword: postPwQ });
    if (!canCommentModerate(post, flags)) {
      return res.status(403).json({ status: "error", message: "Forbidden" });
    }

    const r = await pool.query(
      `DELETE FROM comments
        WHERE id = $1 AND post_id = $2`,
      [commentId, postId]
    );

    if (r.rowCount === 0) {
      return res.status(404).json({ status: "error", message: "Not found" });
    }
    return res.json({ status: "ok" });
  })
);

module.exports = router;
