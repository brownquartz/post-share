// pages/friends/index.js
import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../lib/apiBase';

const POLICY_LABEL = {
  public_open: { label: '全員に公開', cls: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
  friends:     { label: '友だちのみ', cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
};

export default function FriendsFeedPage() {
  const { user, authReady } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authReady || !user) { setLoading(false); return; }
    fetch(`${API_BASE}/api/friends/feed`, { credentials: 'include' })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { setItems(d.items || []); setHasMore(d.hasMore || false); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [authReady, user]);

  async function refresh() {
    setLoading(true); setError(''); setItems([]); setHasMore(false);
    try {
      const res = await fetch(`${API_BASE}/api/friends/feed`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      setItems(d.items || []); setHasMore(d.hasMore || false);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function loadMore() {
    setLoadingMore(true);
    try {
      const res = await fetch(`${API_BASE}/api/friends/feed?offset=${items.length}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      setItems(prev => [...prev, ...(d.items || [])]);
      setHasMore(d.hasMore || false);
    } catch (e) { setError(e.message); }
    finally { setLoadingMore(false); }
  }

  if (authReady && !user) {
    return (
      <main className="page-wrap text-center py-20">
        <p className="text-secondary mb-4">ログインが必要です</p>
        <Link href="/auth/login" className="btn-primary">ログイン</Link>
      </main>
    );
  }

  return (
    <>
    <Head><title>友だちの投稿 | Post Share</title></Head>
    <main className="page-wrap">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-primary">友だちの投稿</h1>
        <button type="button" onClick={refresh} disabled={loading} className="btn-ghost btn-sm disabled:opacity-60">
          更新
        </button>
      </div>

      {loading ? (
        <p className="text-secondary text-sm">読み込み中…</p>
      ) : error ? (
        <p className="text-error text-sm">{error}</p>
      ) : items.length === 0 ? (
        <div className="card p-8 text-center space-y-3">
          <p className="text-secondary text-sm">友だちの投稿がありません</p>
          <p className="text-muted text-xs">投稿ページから友だち申請を送ってみましょう</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map(p => {
            const policy = POLICY_LABEL[p.viewPolicy];
            return (
              <li key={p.id} className="card p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs text-muted mb-1">{p.ownerUsername}</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/posts/${p.id}?aid=${encodeURIComponent(p.postId)}&from=friends`}
                      className="font-semibold text-brand hover:underline"
                    >
                      {p.title || `(タイトルなし #${p.id})`}
                    </Link>
                    {policy && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${policy.cls}`}>
                        {policy.label}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted shrink-0">{new Date(p.createdAt).toLocaleString('ja-JP')}</p>
              </li>
            );
          })}
        </ul>
        {hasMore && (
          <div className="text-center mt-4">
            <button onClick={loadMore} disabled={loadingMore} className="btn-ghost btn-sm disabled:opacity-60">
              {loadingMore ? '読み込み中…' : 'もっと見る'}
            </button>
          </div>
        )}
      )}
    </main>
    </>
  );
}
