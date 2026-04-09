// pages/posts/view.js
import { useState } from "react";
import CryptoJS from "crypto-js";
import Link from "next/link";
import { API_BASE } from "../../lib/apiBase";

function stripHtml(html) { return html.replace(/<[^>]+>/g, ""); }
function truncate(text, max = 60) { return text.length > max ? text.slice(0, max) + "…" : text; }

export default function ViewPosts() {
  const [postId, setPostId] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSearch(e) {
    e?.preventDefault?.();
    setError(""); setItems([]); setLoading(true);
    try {
      const hashed = CryptoJS.SHA256(password).toString();
      const qs = new URLSearchParams({ postId, password: hashed }).toString();
      const res = await fetch(`${API_BASE}/api/posts?${qs}`, { credentials: "include" });
      if (!res.ok) { setError(`HTTP ${res.status}`); return; }
      const list = await res.json();
      if (!Array.isArray(list) || list.length === 0) { setError("該当の投稿が見つかりませんでした"); return; }
      const decrypted = list.map((p) => {
        try {
          const bytes = CryptoJS.AES.decrypt(p.content, hashed);
          const html = bytes.toString(CryptoJS.enc.Utf8) || "";
          return { ...p, preview: truncate(stripHtml(html), 60) };
        } catch { return { ...p, preview: "(復号に失敗しました)" }; }
      });
      setItems(decrypted);
    } catch (err) { setError(err?.message || "エラーが発生しました"); }
    finally { setLoading(false); }
  }

  return (
    <main className="page-wrap-md">
      <h1 className="page-title">投稿を見る</h1>

      <form onSubmit={handleSearch} className="card p-5 space-y-4 mb-8">
        <div>
          <label className="label">ポストID</label>
          <input className="input" value={postId} onChange={(e) => setPostId(e.target.value)} required />
        </div>
        <div>
          <label className="label">パスワード</label>
          <div className="flex gap-2 items-center">
            <input
              className="input"
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <label className="flex items-center gap-1 text-xs text-secondary whitespace-nowrap cursor-pointer">
              <input type="checkbox" checked={showPw} onChange={(e) => setShowPw(e.target.checked)} />
              表示
            </label>
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary disabled:opacity-60">
          {loading ? "読み込み中…" : "検索"}
        </button>
      </form>

      {error && <p className="text-error mb-4">{error}</p>}

      <ul className="space-y-3">
        {items.map((p) => {
          const handleClick = () => {
            sessionStorage.setItem(`view:post:${postId}`, CryptoJS.SHA256(password).toString());
            sessionStorage.setItem(`view:${postId}`, CryptoJS.SHA256(password).toString());
          };
          return (
            <li key={p.id} className="card p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={{ pathname: `/posts/${p.id}`, query: { aid: postId } }}
                  onClick={handleClick}
                  className="font-semibold text-brand hover:underline"
                >
                  {p.title || `(タイトルなし #${p.id})`}
                </Link>
                <p className="text-secondary text-sm mt-1">{p.preview}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                {p.canEdit && (
                  <Link href={`/posts/${p.id}/edit?aid=${encodeURIComponent(postId)}`} className="btn-ghost btn-xs">編集</Link>
                )}
                <Link
                  href={{ pathname: `/posts/${p.id}`, query: { aid: postId } }}
                  onClick={handleClick}
                  className="btn-primary btn-xs"
                >
                  開く
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
