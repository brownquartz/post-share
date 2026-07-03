// pages/friends/[username].js
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../lib/apiBase';

const POLICY_LABEL = {
  public_open: { label: '全員に公開', cls: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
  friends:     { label: '友だちのみ', cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
};

export default function FriendPostsPage() {
  const router = useRouter();
  const { username } = router.query;
  const { user, authReady } = useAuth();
  const [items, setItems] = useState([]);
  const [isFriend, setIsFriend] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authReady || !user || !username) { if (authReady) setLoading(false); return; }
    fetch(`${API_BASE}/api/friends/user/${encodeURIComponent(username)}`, { credentials: 'include' })
      .then(async r => {
        if (r.status === 404) throw new Error('ユーザーが見つかりません');
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(d => { setItems(d.items || []); setIsFriend(d.isFriend || false); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [authReady, user, username]);

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
    <Head><title>{username ? `${username}の投稿` : '投稿'} | Post Share</title></Head>
    <main className="page-wrap">
      <div className="flex items-center gap-3 mb-6">
        <button type="button" onClick={() => router.back()} className="btn-ghost btn-sm">戻る</button>
        <h1 className="text-2xl font-bold text-primary">{username} の投稿</h1>
        {isFriend && (
          <span className="text-xs font-semibold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">友だち</span>
        )}
      </div>

      {loading ? (
        <p className="text-secondary text-sm">読み込み中…</p>
      ) : error ? (
        <p className="text-error text-sm">{error}</p>
      ) : items.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-secondary text-sm">表示できる投稿がありません</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map(p => {
            const policy = POLICY_LABEL[p.viewPolicy];
            return (
              <li key={p.id} className="card p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
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
      )}
    </main>
    </>
  );
}
