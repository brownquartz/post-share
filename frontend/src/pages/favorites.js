// pages/favorites.js
import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../lib/apiBase';

const POLICY_LABEL = {
  public_open:     { label: '全員に公開',     cls: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
  public_password: { label: 'パスワード保護', cls: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' },
  friends:         { label: '友だちのみ',     cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  owner:           { label: '作成者のみ',     cls: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' },
};

export default function FavoritesPage() {
  const { user, authReady } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authReady || !user) { setLoading(false); return; }
    fetch(`${API_BASE}/api/favorites/mine`, { credentials: 'include' })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => setItems(d.items || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [authReady, user]);

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
    <Head><title>お気に入り | Post Share</title></Head>
    <main className="page-wrap">
      <h1 className="page-title">お気に入り</h1>

      {loading ? (
        <p className="text-secondary text-sm">読み込み中…</p>
      ) : error ? (
        <p className="text-error text-sm">{error}</p>
      ) : items.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-secondary text-sm">お気に入りはまだありません</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map(p => {
            const policy = POLICY_LABEL[p.viewPolicy];
            return (
              <li key={p.id} className="card p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {p.canView ? (
                      <Link href={`/posts/${p.id}?aid=${encodeURIComponent(p.postId)}`} className="font-semibold text-brand hover:underline">
                        {p.title || `(タイトルなし #${p.id})`}
                      </Link>
                    ) : (
                      <span className="font-semibold text-muted">{p.title || `(タイトルなし #${p.id})`}</span>
                    )}
                    {policy && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${policy.cls}`}>
                        {policy.label}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-0.5">{p.postId}</p>
                </div>
                <p className="text-xs text-muted shrink-0">{new Date(p.createdAt).toLocaleString('ja-JP')}</p>
              </li>
            );
          })}
        </ul>
      )}
    </main>
    </>
  );
}
