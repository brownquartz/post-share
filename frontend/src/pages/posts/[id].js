// pages/posts/[id].js
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState, useCallback } from "react";
import CryptoJS from "crypto-js";
import DOMPurify from "dompurify";
import Link from "next/link";
import { API_BASE } from "../../lib/apiBase";
import { useAuth } from "../../context/AuthContext";
import FavoriteButton from '../../components/FavoriteButton';
import { useFavoriteStatus } from '../../hooks/useFavoriteStatus';
import { exportTxt, exportDocx } from '../../lib/exportPost';

export default function PostDetail() {
  const { user } = useAuth();
  const router = useRouter();
  const { id, aid, from } = router.query;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [postViewPolicy, setPostViewPolicy] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [canComment, setCanComment] = useState(true);
  const [canModerateComments, setCanModerateComments] = useState(false);
  const [createdAt, setCreatedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ownerUsername, setOwnerUsername] = useState("");
  const [friendStatus, setFriendStatus] = useState(null); // null | 'self' | 'none' | 'pending_sent' | 'pending_received' | 'accepted'
  const [friendshipId, setFriendshipId] = useState(null);
  const [friendReqBusy, setFriendReqBusy] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentName, setCommentName] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState("");

  const postPkId = useMemo(() => (id ? Number(id) : null), [id]);
  const { favorited, setByToggle } = useFavoriteStatus(postPkId);

  const [hashedPassword, setHashedPassword] = useState("");
  const [passwordReady, setPasswordReady] = useState(false);

  // URLハッシュ（#以降）にパスワードハッシュが含まれていればsessionStorageに保存して使う
  useEffect(() => {
    if (!aid) return;
    const hashFromUrl = window.location.hash.replace(/^#/, "");
    if (hashFromUrl) {
      sessionStorage.setItem(`view:post:${aid}`, hashFromUrl);
      sessionStorage.setItem(`view:${aid}`, hashFromUrl);
      setHashedPassword(hashFromUrl);
    } else {
      const stored = sessionStorage.getItem(`view:post:${aid}`) || sessionStorage.getItem(`view:${aid}`) || "";
      setHashedPassword(stored);
    }
    setPasswordReady(true);
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
    if (!id || !aid || !passwordReady) return;

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
            else { setContent(DOMPurify.sanitize(html)); }
          }
        } else { setContent(DOMPurify.sanitize(post.content || "")); }
        const ownerUserId = post.ownerUserId ?? post.userId;
        const isOwner = !!user && ownerUserId != null && Number(user.id) === Number(ownerUserId);
        const isAnyoneAuthed = post.editPolicy === "anyone" && !!postId && !!hashedPassword && String(post.postId) === String(postId);
        setCanEdit(post.canEdit ?? (isOwner || isAnyoneAuthed));
        setCanDelete(post.canDelete ?? post.canEdit ?? (isOwner || isAnyoneAuthed));
        setCanComment(post.canComment ?? true);
        setCanModerateComments(post.canModerateComments ?? false);
        if (post.createdAt) setCreatedAt(post.createdAt);
        if (post.expiresAt) setExpiresAt(post.expiresAt);
        // 投稿者のusernameを保存し友だち状態を取得
        if (post.postId) {
          setOwnerUsername(post.postId);
          if (user) {
            fetch(`${API_BASE}/api/friends/status/${encodeURIComponent(post.postId)}`, { credentials: 'include' })
              .then(r => r.ok ? r.json() : null)
              .then(d => { if (d) { setFriendStatus(d.status); setFriendshipId(d.friendshipId ?? null); } })
              .catch(() => {});
          }
        }
        await loadComments();
      } catch (e) { setError(e?.message || "Error"); setContent(""); setTitle(""); }
      finally { setLoading(false); }
    }

    load();
  }, [id, aid, user, hashedPassword, buildAuthQS, passwordReady]);

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

  async function handleFriendRequest() {
    if (!ownerUsername || friendReqBusy) return;
    setFriendReqBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/friends/request`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: ownerUsername }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { setFriendStatus('pending_sent'); window.dispatchEvent(new CustomEvent('friends-reload')); }
      else alert(data.message || 'エラーが発生しました');
    } catch { alert('エラーが発生しました'); }
    finally { setFriendReqBusy(false); }
  }

  async function handleFriendAccept() {
    if (!friendshipId || friendReqBusy) return;
    setFriendReqBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/friends/${friendshipId}/accept`, { method: 'PUT', credentials: 'include' });
      if (res.ok) { setFriendStatus('accepted'); window.dispatchEvent(new CustomEvent('friends-reload')); }
    } catch {}
    finally { setFriendReqBusy(false); }
  }

  async function handleFriendReject() {
    if (!friendshipId || friendReqBusy) return;
    setFriendReqBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/friends/${friendshipId}/reject`, { method: 'PUT', credentials: 'include' });
      if (res.ok) { setFriendStatus('rejected'); window.dispatchEvent(new CustomEvent('friends-reload')); }
    } catch {}
    finally { setFriendReqBusy(false); }
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
      setCommentName("");
      try {
        const res2 = await fetch(`${API_BASE}/api/posts/${id}/comments${qs ? `?${qs}` : ""}`, { credentials: "include" });
        const list = await res2.json().catch(() => []);
        setComments(Array.isArray(list) ? list : []);
      } catch {}
    } catch (e) { setCommentError(e?.message || "コメント投稿に失敗しました"); }
    finally { setCommentSubmitting(false); }
  }

  async function handleDeleteComment(commentId) {
    if (!confirm('コメントを削除しますか？')) return;
    try {
      const qs = buildAuthQS().toString();
      const url = `${API_BASE}/api/posts/${id}/comments/${commentId}${qs ? `?${qs}` : ''}`;
      const res = await fetch(url, { method: 'DELETE', credentials: 'include' });
      if (res.ok) setComments(prev => prev.filter(c => c.id !== commentId));
    } catch {}
  }

  return (
    <>
    <Head><title>{title ? `${title} | Post Share` : 'Post Share'}</title></Head>
    <main className="page-wrap">

      {/* ========== 投稿カード ========== */}
      <div className="card p-6">
        {/* タイトル行 */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          {/* 左：タイトル ＋ 友だちラベル */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-primary truncate">{title || `Post #${id}`}</h1>
            {user && friendStatus === 'accepted' && (
              <span className="text-xs font-semibold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full shrink-0">友だち</span>
            )}
            {user && friendStatus === 'pending_sent' && (
              <span className="text-xs text-muted shrink-0">申請中</span>
            )}
            {user && friendStatus === 'pending_received' && (
              <span className="text-xs font-semibold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full shrink-0">申請受信中</span>
            )}
          </div>
          {/* 右：ボタン群 */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {postId && (
              <button
                type="button"
                onClick={() => {
                  const base = window.location.href.split("#")[0];
                  const hash = postViewPolicy === "public_password" && hashedPassword ? `#${hashedPassword}` : "";
                  navigator.clipboard.writeText(base + hash);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="btn-ghost btn-sm"
                title="URLをコピー"
              >
                {copied ? "✓ コピー済み" : "URLをコピー"}
              </button>
            )}
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
            {content && (
              <>
                <button type="button" onClick={() => window.print()} className="btn-ghost btn-sm">PDF</button>
                <button type="button" onClick={() => exportTxt(title, content)} className="btn-ghost btn-sm">TXT</button>
                <button type="button" onClick={() => exportDocx(title, content)} className="btn-ghost btn-sm">Word</button>
              </>
            )}
            {user && ownerUsername && friendStatus === 'none' && (
              <button type="button" onClick={handleFriendRequest} disabled={friendReqBusy} className="btn-ghost btn-sm disabled:opacity-60">
                {friendReqBusy ? '送信中…' : '友だち申請'}
              </button>
            )}
            {user && friendStatus === 'pending_received' && (
              <>
                <button type="button" onClick={handleFriendAccept} disabled={friendReqBusy} className="btn-ghost btn-sm text-green-500 disabled:opacity-60">承認</button>
                <button type="button" onClick={handleFriendReject} disabled={friendReqBusy} className="btn-ghost btn-sm disabled:opacity-60">拒否</button>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                if (from === 'friends') { router.push('/friends'); return; }
                postId ? router.push(`/posts/view?restore=${encodeURIComponent(postId)}`) : router.back();
              }}
              className="btn-ghost btn-sm"
            >戻る</button>
          </div>
        </div>

        {/* 日時 */}
        {createdAt && (
          <p className="text-xs text-muted mt-1">{new Date(createdAt).toLocaleString('ja-JP')}</p>
        )}
        {expiresAt && (
          <p className="text-xs text-muted mt-0.5">
            有効期限: {new Date(expiresAt).toLocaleString('ja-JP')}
            {new Date(expiresAt) < new Date() && <span className="text-red-500 ml-1">（期限切れ）</span>}
          </p>
        )}

        {/* 本文 */}
        {loading && <p className="mt-6 text-secondary text-sm">読み込み中…</p>}
        {error   && <p className="mt-6 text-error">{error}</p>}
        {content && <article className="mt-6 prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: content }} />}
      </div>

      {/* ========== コメント ========== */}
      <section id="comments" className="mt-4">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-primary mb-3">コメント</h2>
          {commentsLoading ? (
            <p className="text-secondary text-sm">コメント読み込み中…</p>
          ) : commentError ? (
            <p className="text-error">{commentError}</p>
          ) : (
            <ul className="space-y-3">
              {comments.length === 0 && <li className="text-secondary text-sm">コメントはまだありません</li>}
              {comments.map((c) => (
                <li key={c.id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-primary">{c.name || "匿名"}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted">{c.createdAt ? new Date(c.createdAt).toLocaleString() : ""}</span>
                      {canModerateComments && (
                        <button type="button" onClick={() => handleDeleteComment(c.id)} className="text-xs text-gray-400 hover:text-red-400 transition-colors">×</button>
                      )}
                    </div>
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
        </div>
      </section>
    </main>
    </>
  );
}
