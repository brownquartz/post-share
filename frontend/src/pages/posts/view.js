// pages/posts/view.js
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { API_BASE } from "../../lib/apiBase";

function stripHtml(html) { return html.replace(/<[^>]+>/g, ""); }
function truncate(text, max = 60) { return text.length > max ? text.slice(0, max) + "…" : text; }

export default function ViewPosts() {
  const router = useRouter();
  const [postId, setPostId] = useState("");
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function searchByPostId(searchPostId) {
    setError(""); setItems([]); setLoading(true);
    try {
      const qs = new URLSearchParams({ postId: searchPostId }).toString();
      const res = await fetch(`${API_BASE}/api/posts?${qs}`, { credentials: "include" });
      if (!res.ok) { setError(`HTTP ${res.status}`); return; }
      const list = await res.json();
      if (!Array.isArray(list) || list.length === 0) { setError("該当の投稿が見つかりませんでした"); return; }
      setItems(list.map(p => ({ ...p, preview: truncate(stripHtml(p.content || ""), 60) })));
    } catch (err) { setError(err?.message || "エラーが発生しました"); }
    finally { setLoading(false); }
  }

  async function handleSearch(e) {
    e?.preventDefault?.();
    await searchByPostId(postId);
  }

  // ?restore=postId のとき自動再検索
  useEffect(() => {
    const { restore } = router.query;
    if (!restore) return;
    const restoredId = String(restore);
    setPostId(restoredId);
    searchByPostId(restoredId);
  }, [router.query]);

  return (
    <main className="page-wrap-md">
      <h1 className="page-title">投稿を見る</h1>

      <form onSubmit={handleSearch} className="card p-5 space-y-4 mb-8">
        <div>
          <label className="label">ポストID</label>
          <input className="input" value={postId} onChange={(e) => setPostId(e.target.value)} required />
        </div>
        <button type="submit" disabled={loading} className="btn-primary disabled:opacity-60">
          {loading ? "読み込み中…" : "検索"}
        </button>
      </form>

      {error && <p className="text-error mb-4">{error}</p>}

      <ul className="space-y-3">
        {items.map((p) => (
          <li key={p.id} className="card p-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={{ pathname: `/posts/${p.id}`, query: { aid: postId } }}
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
                className="btn-primary btn-xs"
              >
                開く
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
