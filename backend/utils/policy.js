// backend/utils/policy.js
const { toSha256Hex } = require("./hash");

function bool(v) { return !!v; }

function getFlags(req, post, opts = {}) {
  const userId = req.user ? Number(req.user.id ?? req.user.uid) : null;
  const isOwner = userId != null && !Number.isNaN(userId) && Number(post.owner_user_id) === userId;

  const postIdQ   = pickPostId(opts, post);
  const hashQ     = pickPasswordHex(opts, post);
  const postIdCol = String(post.post_id ?? post.accountid ?? "").trim();
  const hashCol   = String(post.post_password_hash ?? post.view_password_hash ?? "")
                      .trim().toLowerCase();

  const hasPassword = !!postIdQ && !!hashQ && postIdCol === postIdQ && hashCol === hashQ;

  const friendIds = Array.isArray(opts.friendIds) ? opts.friendIds.map(Number) : [];
  const isFriend = userId != null && friendIds.includes(Number(post.owner_user_id));

  return { isOwner, isFriend, hasPassword, userId };
}

function pickPostId(opts, postRow) {
  // リクエスト側（新→旧の順に）
  const fromReq = String(
    opts.postId ?? opts.accountId ?? ""
  ).trim();

  if (fromReq) return fromReq;

  // DB行（新→旧の順に）
  return String(
    postRow.post_id ?? postRow.accountid ?? ""
  ).trim();
}

function pickPasswordHex(opts, postRow) {
  // リクエスト側（新→旧の順に）
  const raw = opts.postPassword ?? opts.password ?? "";
  const hex = toSha256Hex(raw); // すでに hex が来ていても idempotent
  if (hex) return hex;

  // DB行（新→旧の順に）
  return String(
    (postRow.post_password_hash ?? postRow.view_password_hash ?? "")
  ).trim().toLowerCase();
}

function canView(post, f) {
  switch (post.view_policy) {
    case "public_open":     return true;
    case "public_password": return f.hasPassword || f.isOwner;
    case "friends":         return f.isOwner || f.isFriend;
    case "owner":           return f.isOwner;
    case "locked":          return false;
    default:                return false;
  }
}

function canEdit(post, f) {
  switch (post.edit_policy) {
    case "none":     return false;
    case "owner":    return f.isOwner;
    case "friends":  return f.isOwner || f.isFriend;
    case "password": return f.hasPassword || f.isOwner;
    default:         return false;
  }
}

function canDelete(post, f) {
  switch (post.delete_policy) {
    case "none":     return false;
    case "owner":    return f.isOwner;
    case "friends":  return f.isOwner || f.isFriend;
    case "password": return f.hasPassword || f.isOwner;
    default:         return false;
  }
}

function canCommentCreate(post, f) {
  switch (post.comment_create_policy) {
    case "none":    return false;
    case "owner":   return f.isOwner;
    case "friends": return f.isOwner || f.isFriend;
    case "anyone":  return true;
    default:        return false;
  }
}

function canCommentModerate(post, f) {
  switch (post.comment_moderate_policy) {
    case "none":    return false;
    case "owner":   return f.isOwner;
    case "friends": return f.isOwner || f.isFriend;
    case "anyone":  return true;
    default:        return false;
  }
}

module.exports = {
  getFlags,
  canView,
  canEdit,
  canDelete,
  canCommentCreate,
  canCommentModerate,
};
