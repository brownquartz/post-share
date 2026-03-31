// pages/posts/view.js
import { useState } from "react";
import CryptoJS from "crypto-js";
import Link from "next/link";
import { API_BASE } from "../../lib/apiBase";
import { useAuth } from "../../context/AuthContext";

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, "");
}
function truncate(text, max = 50) {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

export default function ViewPosts() {
  const { user } = useAuth();
  const [postId, setpostId] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [items, setItems] = useState([]); // { id, title, content(enc), userId? }
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSearch(e) {
    e?.preventDefault?.();
    setError("");
    setItems([]);
    setLoading(true);

    try {
      const hashed = CryptoJS.SHA256(password).toString();
      const qs = new URLSearchParams({ postId, password: hashed }).toString();
      const url = `${API_BASE}/api/posts?${qs}`;

      const res = await fetch(url, { credentials: "include" });
      if (res.status === 401) {
        setError("認証に失敗しました");
        return;
      }
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        return;
      }

      const list = await res.json();
      if (!Array.isArray(list) || list.length === 0) {
        setError("該当の投稿がありません");
        return;
      }
      // 復号してプレビューを作成（50文字）
      const decrypted = list.map((p) => {
        try {
          const bytes = CryptoJS.AES.decrypt(p.content, hashed);
          const html = bytes.toString(CryptoJS.enc.Utf8) || "";
          return { ...p, preview: truncate(stripHtml(html), 50) };
        } catch {
          return { ...p, preview: "(復号に失敗しました)" };
        }
      });
      setItems(decrypted);
    } catch (err) {
      setError(err?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">View Posts</h1>

      <form onSubmit={handleSearch} className="space-y-4 mb-8">
        <div>
          <label className="block text-sm mb-1">Post ID</label>
          <input
            className="w-full rounded-lg border px-3 py-2"
            value={postId}
            onChange={(e) => setpostId(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Password</label>
          <div className="flex items-center gap-2">
            <input
              className="w-full rounded-lg border px-3 py-2"
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <label className="text-sm flex items-center gap-1">
              <input
                type="checkbox"
                checked={showPw}
                onChange={(e) => setShowPw(e.target.checked)}
              />
              Show
            </label>
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="btn btn-solid-brand hover-lift focus-ring disabled:opacity-60">
          {loading ? "Loading..." : "View"}
        </button>
      </form>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {/* 一覧 */}
      <ul className="space-y-3">
        {items.map((p) => {
          // 権限：サーバーが canEdit/canComment を返すならそれを使用。
          // 無い場合はログインユーザーと投稿の userId を比較。
          const canEdit = p.canEdit ?? (user && p.userId && user.id === p.userId);
          const canComment = p.canComment ?? true;

          // 詳細に渡す：安全のため、平文ではなくハッシュをクエリに載せる。
          // ここでは簡易に sessionStorage に保存 → 詳細で取り出す方式にする。
          const handleLinkClick = () => {
            const key = `view:${postId}`;
            const hashed = CryptoJS.SHA256(password).toString();
            sessionStorage.setItem(key, hashed);
          };

          return (
            <li key={p.id} className="rounded-xl border p-4 bg-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link
                    href={{ pathname: `/posts/${p.id}`, query: { aid: postId } }}
                    onClick={handleLinkClick}
                    className="text-base font-semibold text-blue-700 hover:underline"
                  >
                    {p.title || `(No title #${p.id})`}
                  </Link>
                  <p className="text-slate-600 mt-1">{p.preview}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {canEdit && (
                    <Link href={`/posts/${p.id}/edit`} className="btn btn-outline-light focus-ring">
                      Edit
                    </Link>
                  )}
                  {canComment && (
                    <Link href={`/posts/${p.id}#comments`} className="btn btn-outline-light focus-ring">
                      Comment
                    </Link>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
