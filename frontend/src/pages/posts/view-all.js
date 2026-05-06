import Head from 'next/head';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { API_BASE } from '../../lib/apiBase';

async function apiCall(path, options = {}) {
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

// isPendingDelete: favorited だが削除予定（ページ離脱時に反映）
function FavoriteButton({ postPkId, initialFavorited, isPendingDelete, onAdd, onTogglePending }) {
  const [favorited, setFavorited] = useState(!!initialFavorited);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (busy) return;
    if (!favorited) {
      // 追加：即時反映
      setBusy(true);
      try {
        await apiCall('/api/favorites', { method: 'POST', body: JSON.stringify({ postId: postPkId }) });
        setFavorited(true);
        onAdd?.();
      } catch (e) { alert(e.message); }
      finally { setBusy(false); }
    } else {
      // 削除：ページ離脱時に反映（pending トグル）
      onTogglePending(postPkId);
    }
  };

  const starClass = !favorited
    ? 'text-gray-400 dark:text-gray-500 hover:text-yellow-400'
    : isPendingDelete
      ? 'text-yellow-400 opacity-30'
      : 'text-yellow-400 hover:opacity-60';

  return (
    <button
      onClick={toggle}
      disabled={busy}
      title={
        !favorited ? 'お気に入りに追加' :
        isPendingDelete ? 'もう1度押すとキャンセル' :
        'お気に入りから削除'
      }
      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all
                  cursor-pointer select-none disabled:opacity-50 ${starClass}`}
    >
      <span className="text-xl leading-none">{favorited ? '★' : '☆'}</span>
    </button>
  );
}

function PostCard({ item, isPendingDelete, onAdd, onTogglePending }) {
  const router = useRouter();
  const isLocked = !item.canView;

  const handleTitleClick = async () => {
    if (isLocked) {
      const plain = prompt('この投稿のパスワードを入力してください：');
      if (!plain) return;
      const hex = await sha256Hex(plain);
      sessionStorage.setItem(`view:post:${item.postId}`, hex);
      sessionStorage.setItem(`view:${item.postId}`, hex);
    }
    router.push(`/posts/${item.id}?aid=${encodeURIComponent(item.postId)}`);
  };

  return (
    <div className="card p-4 flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted">{item.postId}</div>
        <button
          type="button"
          onClick={handleTitleClick}
          className="font-semibold text-primary text-left w-full truncate block hover:underline cursor-pointer"
        >
          {item.title || '(タイトルなし)'}
        </button>
        <div className="text-xs text-secondary mt-0.5">
          {item.viewPolicy} · {new Date(item.createdAt).toLocaleString()}
        </div>
      </div>
      <div className="shrink-0">
        <FavoriteButton
          postPkId={item.id}
          initialFavorited={item.isFavorited}
          isPendingDelete={isPendingDelete}
          onAdd={onAdd}
          onTogglePending={onTogglePending}
        />
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

  // 削除予定IDの管理：ref で flush、state で UI 更新
  const pendingRef = useRef(new Set());
  const [pendingSet, setPendingSet] = useState(new Set());

  const togglePending = useCallback((postPkId) => {
    if (pendingRef.current.has(postPkId)) {
      pendingRef.current.delete(postPkId);
    } else {
      pendingRef.current.add(postPkId);
    }
    setPendingSet(new Set(pendingRef.current));
  }, []);

  // ページ離脱時に pending 削除を一括実行
  const flushDeletes = useCallback(() => {
    const ids = [...pendingRef.current];
    if (ids.length === 0) return;
    pendingRef.current = new Set();
    setPendingSet(new Set());
    ids.forEach(id => {
      fetch(`${API_BASE}/api/favorites/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        keepalive: true,
      }).catch(() => {});
    });
  }, []);

  const fetchList = useCallback(async (nextTab) => {
    if (!user) { setItems([]); return; }
    setLoading(true);
    setFetchError('');
    try {
      const endpoint = nextTab === 'favorites' ? '/api/favorites/mine' : '/api/posts/my?myId=1';
      const data = await apiCall(endpoint);
      setItems(data.items || []);
    } catch (e) {
      console.error('[fetchList]', e);
      setFetchError(e.message || 'エラーが発生しました');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // タブ切替・ログイン状態変化時に取得
  useEffect(() => {
    if (!authReady || !user) { setItems([]); return; }
    fetchList(tab);
  }, [tab, authReady, user]);

  // このページに戻ってきたときに再取得
  useEffect(() => {
    const onRouteComplete = (url) => {
      if (!url.includes('/posts/view-all')) return;
      if (authReady && user) fetchList(tab);
    };
    router.events.on('routeChangeComplete', onRouteComplete);
    return () => router.events.off('routeChangeComplete', onRouteComplete);
  }, [router.events, authReady, user, tab]);

  // ページ離脱時に pending 削除を実行
  useEffect(() => {
    router.events.on('routeChangeStart', flushDeletes);
    return () => router.events.off('routeChangeStart', flushDeletes);
  }, [router.events, flushDeletes]);

  useEffect(() => {
    window.addEventListener('beforeunload', flushDeletes);
    return () => window.removeEventListener('beforeunload', flushDeletes);
  }, [flushDeletes]);

  const emptyText = useMemo(
    () => tab === 'favorites' ? 'お気に入りがありません' : '自分のIDで作成した投稿がありません',
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
    <>
    <Head><title>マイポスト | Post Share</title></Head>
    <main className="page-wrap pt-10">
      <h1 className="page-title">マイポスト</h1>

      <div className="flex gap-2 mb-6">
        {['favorites', 'owner'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`btn focus-ring ${tab === t ? 'btn-solid-brand' : 'btn-secondary'}`}
          >
            {t === 'favorites' ? '★ お気に入り' : '自分の投稿'}
          </button>
        ))}
      </div>

      {fetchError && <p className="text-error text-sm mb-3">{fetchError}</p>}

      {loading ? (
        <p className="text-secondary text-sm">読み込み中…</p>
      ) : items.length === 0 && !fetchError ? (
        <p className="text-secondary text-sm">{emptyText}</p>
      ) : (
        <div className="space-y-3">
          {items.map(it => (
            <PostCard
              key={it.id}
              item={it}
              isPendingDelete={pendingSet.has(it.id)}
              onAdd={() => {}}
              onTogglePending={togglePending}
            />
          ))}
        </div>
      )}
    </main>
    </>
  );
}
