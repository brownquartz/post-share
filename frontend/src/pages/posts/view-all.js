import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/router';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

async function sha256Hex(str) {
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function FavoriteButton({ postPkId, initialFavorited, onChanged }) {
  const [favorited, setFavorited] = useState(!!initialFavorited);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (!favorited) {
        await api('/api/favorites', { method: 'POST', body: JSON.stringify({ postId: postPkId }) });
        setFavorited(true); onChanged?.(true);
      } else {
        await api(`/api/favorites/${postPkId}`, { method: 'DELETE' });
        setFavorited(false); onChanged?.(false);
      }
    } catch (e) { alert(e.message); }
    finally { setBusy(false); }
  };

  return (
    <button
      onClick={toggle} disabled={busy}
      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium
        border transition-colors cursor-pointer select-none disabled:opacity-50
        ${favorited
          ? 'border-yellow-500/70 text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20'
          : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-yellow-500/60 hover:text-yellow-400 hover:bg-yellow-500/10'
        }`}
      title={favorited ? 'お気に入りを解除' : 'お気に入りに追加'}
    >
      <span>{favorited ? '★' : '☆'}</span>
      <span>{favorited ? 'お気に入り済' : 'お気に入り'}</span>
    </button>
  );
}

function PostCard({ item, onFavoriteChanged }) {
  const router = useRouter();
  const isLocked = !item.canView;

  const handleUnlock = async () => {
    const plain = prompt('この投稿のパスワードを入力してください：');
    if (!plain) return;
    const hex = await sha256Hex(plain);
    sessionStorage.setItem(`view:post:${item.postId}`, hex);
    sessionStorage.setItem(`view:${item.postId}`, hex);
    router.push(`/posts/${item.id}?aid=${encodeURIComponent(item.postId)}`);
  };

  return (
    <div className="card p-4 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-xs text-muted">{item.postId}</div>
        <div className="font-semibold text-primary truncate">{item.title || '(タイトルなし)'}</div>
        <div className="text-xs text-secondary mt-0.5">
          {item.viewPolicy} · {new Date(item.createdAt).toLocaleString()}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <FavoriteButton postPkId={item.id} initialFavorited={item.isFavorited} onChanged={onFavoriteChanged} />
        {isLocked ? (
          <button onClick={handleUnlock} className="btn-ghost btn-xs">解錠</button>
        ) : (
          <Link href={`/posts/${item.id}?aid=${encodeURIComponent(item.postId)}`} className="btn-primary btn-xs">開く</Link>
        )}
      </div>
    </div>
  );
}

export default function ViewAllPostsPage() {
  const { user, authReady } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState('favorites');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const fetchList = async (nextTab) => {
    if (!user) { setItems([]); return; }
    setLoading(true);
    setFetchError('');
    try {
      const endpoint = nextTab === 'favorites' ? '/api/favorites/mine' : '/api/posts/my?ownerOnly=1';
      const data = await api(endpoint);
      setItems(data.items || []);
    } catch (e) {
      console.error('[fetchList]', e);
      setFetchError(e.message || 'エラーが発生しました');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // タブ切替・ログイン状態変化・ページ再表示時に取得
  useEffect(() => {
    if (!authReady || !user) { setItems([]); return; }
    fetchList(tab);
  }, [tab, authReady, user]);

  // Next.js クライアントルーティングで戻ってきたときも再取得
  useEffect(() => {
    const onRouteChange = (url) => {
      if (!url.includes('/posts/view-all')) return;
      if (authReady && user) fetchList(tab);
    };
    router.events.on('routeChangeComplete', onRouteChange);
    return () => router.events.off('routeChangeComplete', onRouteChange);
  }, [router.events, authReady, user, tab]);

  const emptyText = useMemo(
    () => tab === 'favorites' ? 'お気に入りがありません' : 'オーナー専用の投稿がありません',
    [tab]
  );

  if (authReady && !user) {
    return (
      <main className="page-wrap text-center py-20">
        <p className="text-gray-500 dark:text-gray-400 mb-4">ログインが必要です</p>
        <Link href="/auth/login" className="btn-primary">ログイン</Link>
      </main>
    );
  }

  return (
    <main className="page-wrap pt-10">
      <h1 className="page-title">マイポスト</h1>

      <div className="flex gap-2 mb-6">
        {['favorites', 'owner'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`btn focus-ring ${tab === t ? 'btn-solid-brand' : 'btn-secondary'}`}
          >
            {t === 'favorites' ? '★ お気に入り' : 'オーナーのみ'}
          </button>
        ))}
      </div>

      {fetchError && (
        <p className="text-error text-sm mb-3">{fetchError}</p>
      )}
      {loading ? (
        <p className="text-secondary text-sm">読み込み中…</p>
      ) : items.length === 0 && !fetchError ? (
        <p className="text-secondary text-sm">{emptyText}</p>
      ) : (
        <div className="space-y-3">
          {items.map(it => (
            <PostCard key={it.id} item={it} onFavoriteChanged={() => {}} />
          ))}
        </div>
      )}
    </main>
  );
}
