// backend/routes/posts.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const {
  parseIntParam,
  requireQueryFields,
  requireBodyFields,
  queryCatch,
  beforeProcess,
} = require("../utils/routeTools");

const {
  getFlags, canView, canEdit, canDelete,
  canCommentCreate, canCommentModerate,
} = require("../utils/policy");

// 一覧：postId + password で絞込み（※編集可否も一緒に返す）
router.get(
  "/",
  beforeProcess(requireQueryFields(["postId", "password"])),
  queryCatch("GET /api/posts", async (req, res) => {
    const postId = String(req.query.postId || "").trim();
    const password  = req.query.postpassword || req.query.password || "";

    const { rows } = await pool.query(
      `SELECT id, title, content, post_id, post_password_hash,
              owner_user_id, view_policy, edit_policy, delete_policy,
              comment_create_policy, comment_moderate_policy,
              created_at AS "createdAt", expires_at AS "expiresAt"
         FROM posts
        WHERE post_id = $1
        ORDER BY created_at DESC`,
      [postId]
    );

    // flags を計算して canView でサーバ側もフィルタ
    const out = [];
    for (const r of rows) {
      const flags = getFlags(req, r, { postId, postPassword:password });
      if (!canView(r, flags)) continue;

      out.push({
        id: r.id,
        title: r.title,
        content: r.content,
        postId: r.post_id,
        createdAt: r.createdAt,
        expiresAt: r.expiresAt,
        editPolicy: r.edit_policy,
        viewPolicy: r.view_policy,
        ownerUserId: r.owner_user_id,
        canEdit: canEdit(r, flags),
        canDelete: canDelete(r, flags),
        canComment: canCommentCreate(r, flags),
      });
    }

    // パス違いの場合だけ 401 を返す（従来互換）
    if (out.length === 0) {
      const exists = await pool.query(
        `SELECT 1 FROM posts WHERE post_id = $1 LIMIT 1`,
        [postId]
      );
      if (exists.rowCount > 0) {
        return res.status(401).json({ status: "error", message: "Invalid password" });
      }
    }
    return res.json(out);
  })
);

// 詳細
router.get(
  "/:id",
  beforeProcess(parseIntParam("id")),
  queryCatch("GET /api/posts/:id", async (req, res) => {
    const id = req.params.id;
    const postId = String(req.query.postId || "").trim();
    const password  = req.query.postPassword || req.query.password || "";

    const q = await pool.query(
      `SELECT id, title, content, post_id, post_password_hash,
              owner_user_id, view_policy, edit_policy, delete_policy,
              comment_create_policy, comment_moderate_policy,
              created_at AS "createdAt", expires_at AS "expiresAt"
         FROM posts WHERE id = $1`,
      [id]
    );
    if (q.rowCount === 0) return res.status(404).json({ status: "error", message: "Not found" });

    const p = q.rows[0];
    const flags = getFlags(req, p, { postId, postPassword:password });

    if (!canView(p, flags)) {
      return res.status(401).json({ status: "error", message: "Unauthorized" });
    }

    return res.json({
      id: p.id,
      title: p.title,
      content: p.content,
      postId: p.post_id, 
      createdAt: p.createdAt,
      expiresAt: p.expiresAt,
      viewPolicy: p.view_policy,
      editPolicy: p.edit_policy,
      ownerUserId: p.owner_user_id,
      canEdit: canEdit(p, flags),
      canDelete: canDelete(p, flags),
      canComment: canCommentCreate(p, flags),
    });
  })
);

// 作成：editPolicy を受け取り、owner_user_id を設定
router.post(
  "/",
  beforeProcess(requireBodyFields(["title", "content", "postId", "viewPolicy"])),
  queryCatch("POST /api/posts", async (req, res) => {
    let {
      title, content,
      postId, postPassword,
      viewPolicy, editPolicy, deletePolicy,
      commentCreatePolicy, commentModeratePolicy,
    } = req.body;

    postId = String(postId ?? "").trim();

    // normalize (安全側)
    const viewSet = new Set(["public_open","public_password","friends","owner","locked"]);
    if (!viewSet.has(viewPolicy)) viewPolicy = "public_password";

    const mutSet  = new Set(["none","owner","friends","password"]);
    if (!mutSet.has(editPolicy))   editPolicy   = "owner";
    if (!mutSet.has(deletePolicy)) deletePolicy = editPolicy;

    const comSet  = new Set(["none","owner","friends","anyone"]);
    if (!comSet.has(commentCreatePolicy))   commentCreatePolicy   = "anyone";
    if (!comSet.has(commentModeratePolicy)) commentModeratePolicy = "owner";

    // public_password のみパス必須
    let viewPasswordHash = null;
    const raw = req.body.postPassword ?? req.body.password; // 新優先
    if (viewPolicy === "public_password") {
      if (!raw || !/^[0-9a-f]{64}$/i.test(raw)) {
        return res.status(400).json({ status:"error", message:"Missing or invalid postPassword" });
      }
      viewPasswordHash = raw.toLowerCase();
    }

    // ログイン必須条件（それ以外は未ログインOK）
    const needsLogin =
      viewPolicy === "owner" || viewPolicy === "friends" ||
      ["owner","friends","password"].some(v => [editPolicy, deletePolicy].includes(v)) ||
      ["owner","friends"].some(v => [commentCreatePolicy, commentModeratePolicy].includes(v));

    const userId = (req.user?.id ?? req.user?.uid) ?? null;
    if (needsLogin && !userId) {
      return res.status(401).json({ status:"error", message:"Login required" });
    }

    // ※ レガシーの any/locked→変換は削除（不要＆副作用で needsLogin が立つのを防ぐ）

    const { rows } = await pool.query(
      `INSERT INTO posts
         (title, content,
          post_id, post_password_hash,
          view_policy, edit_policy, delete_policy,
          comment_create_policy, comment_moderate_policy,
          owner_user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id`,
      [
        title, content,
        postId, viewPasswordHash,
        viewPolicy, editPolicy, deletePolicy,
        commentCreatePolicy, commentModeratePolicy,
        userId // 未ログインなら null
      ]
    );

    return res.status(201).json({ status:"ok", post: rows[0] });
  })
);

// 更新（タイトル/本文/ポリシー/閲覧PW）：権限チェック必須
router.put(
  "/:id",
  beforeProcess(parseIntParam("id")),
  queryCatch("PUT /api/posts/:id", async (req, res) => {
    const id = req.params.id;

    const q = await pool.query(
      `SELECT id, post_id, post_password_hash, owner_user_id,
              view_policy, edit_policy, delete_policy,
              comment_create_policy, comment_moderate_policy
         FROM posts WHERE id = $1`,
      [id]
    );
    if (q.rowCount === 0) return res.status(404).json({ status: "error", message: "Not found" });

    const current = q.rows[0];
    const postId = String(req.body.postId || req.query.postId || "").trim();
    const password  = req.body.password || req.query.password || "";
    const flags = getFlags(req, current, { postId, password });
    if (!canEdit(current, flags)) {
      return res.status(403).json({ status: "error", message: "Forbidden" });
    }

    // ...（ここはあなたの既存ロジックのまま：sets/vals 構築）
    // newPassword が来たら toSha256Hex() で保存、view_policy は一旦変更可だが
    // まだフロントは public_password 想定なので、後段階で活用
    // （略）
  })
);

// 削除：権限チェック必須
router.delete(
  "/:id",
  beforeProcess(parseIntParam("id")),
  queryCatch("DELETE /api/posts/:id", async (req, res) => {
    const id = req.params.id;

    const q = await pool.query(
      `SELECT id, post_id, post_password_hash, owner_user_id,
              view_policy, edit_policy, delete_policy,
              comment_create_policy, comment_moderate_policy
         FROM posts WHERE id = $1`,
      [id]
    );
    if (q.rowCount === 0) return res.status(404).json({ status: "error", message: "Not found" });

    const current = q.rows[0];
    const postId = String(req.body?.postId || req.query?.postId || "").trim();
    const password  = req.body?.postPassword || req.query?.postPassword || req.body?.password || req.query?.password || "";
    const flags = getFlags(req, current, { postId, postPassword: password });
    if (!canDelete(current, flags)) {
      return res.status(403).json({ status: "error", message: "Forbidden" });
    }

    const r = await pool.query(`DELETE FROM posts WHERE id = $1`, [id]);
    if (r.rowCount === 0) return res.status(404).json({ status: "error", message: "Not found" });
    return res.json({ status: "ok" });
  })
);

const commentsRouter = require("./comments");
router.use("/:id/comments", commentsRouter);

module.exports = router;
