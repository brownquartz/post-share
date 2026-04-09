// pages/posts/[id].js
import { useRouter } from "next/router";
import { useEffect, useMemo, useState, useCallback } from "react";
import CryptoJS from "crypto-js";
import Link from "next/link";
import { API_BASE } from "../../lib/apiBase";
import { useAuth } from "../../context/AuthContext";
import FavoriteButton from '../../components/FavoriteButton';
import { useFavoriteStatus } from '../../hooks/useFavoriteStatus';

export default function PostDetail() {
  const { user } = useAuth();
  const router = useRouter();
  const { id, aid } = router.query;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [postViewPolicy, setPostViewPolicy] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [canComment, setCanComment] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentName, setCommentName] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState("");

  const postPkId = useMemo(() => (id ? Number(id) : null), [id]);
  const { favorited, setByToggle } = useFavoriteStatus(postPkId);

  const hashedPassword = useMemo(() => {
    if (typeof window === "undefined" || !aid) return "";
    return sessionStorage.getItem(`view:post:${aid}`) || sessionStorage.getItem(`view:${aid}`) || "";
  }, [aid]);

  const postId = useMemo(() => (aid ? String(aid).trim() : ""), [aid]);

  const buildAuthQS = useCallback(() => {
    const qs = new URLSearchParams();
    if (postId && hashedPassword) {
      qs.set("postId", postId);
      qs.set("postPassword", hashedPassword);
      qs.set("password", hashedPassword);
    }
    return qs;
  }, [postId, hashedPassword]);

  useEffect(() => {
    if (!id || !aid) return;

    async function loadComments() {
      setCommentsLoading(true); setCommentError("");
      try {
        const qs = buildAuthQS().toString();
        const url = `${API_BASE}/api/posts/${id}/comments${qs ? `?${qs}` : ""}`;
        const res = await fetch(url, { credentials: "include" });
        if (res.status === 401) { setCommentError("コメントの認証に失敗しました"); return; }
        if (!res.ok) { setCommentError(`コメント取得エラー (${res.status})`); return; }
        const list = await res.json();
        setComments(Array.isArray(list) ? list : []);
      } catch (e) { setCommentError(e?.message || "コメント取得エラー"); }
      finally { setCommentsLoading(false); }
    }

    async function load() {
      setError(""); setLoading(true); setContent(""); setTitle("");
      try {
        const qs = buildAuthQS().toString();
        const url = `${API_BASE}/api/posts/${id}${qs ? `?${qs}` : ""}`;
        const res = await fetch(url, { credentials: "include" });
        if (res.status === 401) { setError("認証に失敗しました"); setContent(""); return; }
        if (!res.ok) { setError(`HTTP ${res.status}`); setContent(""); return; }
        const post = await res.json();
        const isEncrypted = post.viewPolicy === "public_password";
        setTitle(post.title || `(No title #${id})`);
        setPostViewPolicy(post.viewPolicy || null);
        if (isEncrypted) {
          if (!hashedPassword) { setError("認証情報がありません（一覧から入り直してください）"); setContent(""); }
          else {
            const bytes = CryptoJS.AES.decrypt(post.content, hashedPassword);
            const html = bytes.toString(CryptoJS.enc.Utf8);
            if (!html) { setError("復号に失敗しました（パスワードを確認）"); setContent(""); }
            else { setContent(html); }
          }
        } else { setContent(post.content || ""); }
        const ownerUserId = post.ownerUserId ?? post.userId;
        const isOwner = !!user && ownerUserId != null && Number(user.id) === Number(ownerUserId);
        const isAnyoneAuthed = post.editPolicy === "anyone" && !!postId && !!hashedPassword && String(post.postId) === String(postId);
        setCanEdit(post.canEdit ?? (isOwner || isAnyoneAuthed));
        setCanDelete(post.canDelete ?? post.canEdit ?? (isOwner || isAnyoneAuthed));
        setCanComment(post.canComment ?? true);
        await loadComments();
      } catch (e) { setError(e?.message || "Error"); setContent(""); setTitle(""); }
      finally { setLoading(false); }
    }

    load();
  }, [id, aid, user, hashedPassword, buildAuthQS]);

  useEffect(() => {
    if (postViewPolicy === "owner" && !user) {
      setContent(""); setError("ログアウトしたため表示できません");
      router.replace("/posts/view-all");
    }
  }, [postViewPolicy, user, router]);

  async function handleDelete() {
    if (!id) return alert("Invalid post id");
    if (!confirm("Delete this post?")) return;
    const qs = buildAuthQS().toString();
    const url = `${API_BASE}/api/posts/${id}${qs ? `?${qs}` : ""}`;
    try {
      setDeleting(true);
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `Delete failed (${res.status})`);
      router.push("/posts/view-all");
    } catch (err) { alert(err.message || "Delete failed"); }
    finally { setDeleting(false); }
  }

  async function handleSubmitComment(e) {
    e.preventDefault?.();
    if (!commentText.trim()) return;
    setCommentSubmitting(true); setCommentError("");
    try {
      const qs = buildAuthQS().toString();
      const url = `${API_BASE}/api/posts/${id}/comments${qs ? `?${qs}` : ""}`;
      const res = await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: commentText, name: commentName || undefined }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `Comment failed (${res.status})`);
      setCommentText("");
      try {
        const res2 = await fetch(`${API_BASE}/api/posts/${id}/comments${qs ? `?${qs}` : ""}`, { credentials: "include" });
        const list = await res2.json().catch(() => []);
        setComments(Array.isArray(list) ? list : []);
      } catch {}
    } catch (e) { setCommentError(e?.message || "コメント投稿に失敗しました"); }
    finally { setCommentSubmitting(false); }
  }

  return (
    <main className="page-wrap">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-primary flex-1 min-w-0 truncate">{title || `Post #${id}`}</h1>
        <div className="flex items-center gap-2 shrink-0">
          {user && postPkId ? (
            <FavoriteButton postPkId={postPkId} initialFavorited={favorited} onChanged={setByToggle} />
          ) : null}
          {canEdit && (
            <Link href={`/posts/${id}/edit?aid=${encodeURIComponent(postId)}`} className="btn-ghost btn-sm">編集</Link>
          )}
          {canDelete && (
            <button type="button" onClick={handleDelete} disabled={deleting} className="btn btn-danger hover-lift focus-ring btn-sm disabled:opacity-60">
              {deleting ? "削除中…" : "削除"}
            </button>
          )}
          <Link href="/posts/view-all" className="btn-ghost btn-sm">戻る</Link>
        </div>
      </div>

      {loading && <p className="mt-6 text-secondary text-sm">読み込み中…</p>}
      {error   && <p className="mt-6 text-error">{error}</p>}

      {content && <article className="mt-6 prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: content }} />}

      <section id="comments" className="mt-10">
        <h2 className="text-lg font-semibold text-primary mb-3">コメント</h2>
        {commentsLoading ? (
          <p className="text-secondary text-sm">コメント読み込み中…</p>
        ) : commentError ? (
          <p className="text-error">{commentError}</p>
        ) : (
          <ul className="space-y-3">
            {comments.length === 0 && <li className="text-secondary text-sm">コメントはまだありません</li>}
            {comments.map((c) => (
              <li key={c.id} className="card p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-primary">{c.name || "匿名"}</span>
                  <span className="text-xs text-muted">{c.createdAt ? new Date(c.createdAt).toLocaleString() : ""}</span>
                </div>
                <p className="mt-1 text-secondary text-sm whitespace-pre-wrap">{c.content}</p>
              </li>
            ))}
          </ul>
        )}
        {canComment && (
          <form onSubmit={handleSubmitComment} className="mt-4 space-y-2">
            <label className="flex items-center gap-2 text-xs text-secondary">
              <span>表示名</span>
              <input className="input !py-1 !px-2 w-32" value={commentName} onChange={(e) => setCommentName(e.target.value)} placeholder="匿名" />
            </label>
            <div className="flex gap-2">
              <input className="input flex-1" placeholder="コメントを入力…" value={commentText} onChange={(e) => setCommentText(e.target.value)} />
              <button type="submit" className="btn-primary" disabled={commentSubmitting}>
                {commentSubmitting ? "投稿中…" : "投稿"}
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
