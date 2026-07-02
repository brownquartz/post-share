// pages/posts/view.js
import Head from "next/head";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import CryptoJS from "crypto-js";
import { API_BASE } from "../../lib/apiBase";

function stripHtml(html) { return html.replace(/<[^>]+>/g, ""); }
function truncate(text, max = 60) { return text.length > max ? text.slice(0, max) + "…" : text; }
function sha256Hex(str) { return CryptoJS.SHA256(str).toString(); }

const POLICY_LABEL = {
  public_open:     { label: '全員に公開',     cls: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
  public_password: { label: 'パスワード保護', cls: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' },
  friends:         { label: '友だちのみ',     cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  owner:           { label: '作成者のみ',     cls: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' },
};

const HISTORY_KEY = "view:idHistory";
const MAX_HISTORY = 5;

function loadHistory() {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
}

function saveHistory(id) {
  if (!id || typeof window === "undefined") return;
  const prev = loadHistory().filter(v => v !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify([id, ...prev].slice(0, MAX_HISTORY)));
}

export default function ViewPosts() {
  const router = useRouter();
  const [postId, setPostId] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => { setHistory(loadHistory()); }, []);

  async function searchByPostId(searchPostId, hashedPw = "") {
    setError(""); setItems([]); setLoading(true); setShowHistory(false);
    try {
      const qs = new URLSearchParams({ postId: searchPostId });
      if (hashedPw) {
        qs.set("postpassword", hashedPw);
        qs.set("password", hashedPw);
        sessionStorage.setItem(`view:post:${searchPostId}`, hashedPw);
        sessionStorage.setItem(`view:${searchPostId}`, hashedPw);
      }
      sessionStorage.setItem("view:lastSearch", searchPostId);
      const res = await fetch(`${API_BASE}/api/posts?${qs}`, { credentials: "include" });
      if (!res.ok) { setError(`HTTP ${res.status}`); return; }
      const list = await res.json();
      if (!Array.isArray(list) || list.length === 0) {
        setError(
          hashedPw
            ? "投稿が見つかりませんでした。IDまたはパスワードをご確認ください"
            : "投稿が見つかりませんでした。パスワードが必要な投稿の場合はパスワードを入力してください"
        );
        return;
      }
      saveHistory(searchPostId);
      setHistory(loadHistory());
      setItems(list.map(p => ({ ...p, preview: truncate(stripHtml(p.content || ""), 60) })));
    } catch (err) { setError(err?.message || "エラーが発生しました"); }
    finally { setLoading(false); }
  }

  async function handleSearch(e) {
    e?.preventDefault?.();
    const hashedPw = password.trim() ? sha256Hex(password) : "";
    await searchByPostId(postId, hashedPw);
  }

  function handleHistorySelect(id) {
    setPostId(id);
    setShowHistory(false);
    const hashedPw = password.trim() ? sha256Hex(password) : "";
    searchByPostId(id, hashedPw);
  }

  // ?restore= または sessionStorage から復元
  useEffect(() => {
    if (!router.isReady) return;
    const { restore } = router.query;
    const toRestore = restore
      ? String(restore)
      : (typeof window !== "undefined" ? sessionStorage.getItem("view:lastSearch") || "" : "");
    if (!toRestore) return;
    setPostId(toRestore);
    searchByPostId(toRestore);
  }, [router.isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
    <Head><title>投稿を見る | Post Share</title></Head>
    <main className="page-wrap-md">
      <h1 className="page-title">投稿を見る</h1>

      <form onSubmit={handleSearch} className="card p-5 space-y-4 mb-8">
        <div>
          <label className="label">ポストID</label>
          <div className="relative">
            <input
              className="input"
              value={postId}
              onChange={(e) => { setPostId(e.target.value); setShowHistory(true); }}
              onFocus={() => setShowHistory(true)}
              onBlur={() => setTimeout(() => setShowHistory(false), 150)}
              required
            />
            {showHistory && history.length > 0 && (
              <ul className="absolute z-10 w-full mt-1 card border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
                {history.map(id => (
                  <li key={id}>
                    <button
                      type="button"
                      onMouseDown={() => handleHistorySelect(id)}
                      className="w-full text-left px-3 py-2 text-sm text-secondary hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      {id}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div>
          <label className="label">
            パスワード <span className="text-muted font-normal text-xs ml-1">（任意）</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              className="input"
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワードなしの場合は空白でOK"
            />
            <label className="text-xs text-secondary flex items-center gap-1 whitespace-nowrap cursor-pointer">
              <input type="checkbox" checked={showPw} onChange={(e) => setShowPw(e.target.checked)} /> 表示
            </label>
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary disabled:opacity-60">
          {loading ? "読み込み中…" : "検索"}
        </button>
      </form>

      {error && (
        <div className="card p-4 mb-4 border-yellow-400/40 bg-yellow-50/10">
          <p className="text-sm text-yellow-600 dark:text-yellow-400">{error}</p>
        </div>
      )}

      <ul className="space-y-3">
        {items.map((p) => {
          const policy = POLICY_LABEL[p.viewPolicy];
          return (
            <li key={p.id} className="card p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Link
                    href={{ pathname: `/posts/${p.id}`, query: { aid: postId } }}
                    className="font-semibold text-brand hover:underline"
                  >
                    {p.title || `(タイトルなし #${p.id})`}
                  </Link>
                  {policy && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${policy.cls}`}>
                      {policy.label}
                    </span>
                  )}
                </div>
                <p className="text-secondary text-sm">{p.preview}</p>
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
          );
        })}
      </ul>
    </main>
    </>
  );
}
