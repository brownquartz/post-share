import { useEffect, useMemo, useState, useRef } from 'react';
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
        setFavorited(true);
        onChanged?.(true);
      } else {
        await api(`/api/favorites/${postPkId}`, { method: 'DELETE' });
        setFavorited(false);
        onChanged?.(false);
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`inline-flex items-center gap-1 rounded-2xl px-3 py-1 border text-sm
        ${favorited ? 'border-yellow-500' : 'border-gray-400'}`}
      title={favorited ? 'Unfavorite' : 'Favorite'}
    >
      <span>{favorited ? '★' : '☆'}</span>
      <span>{favorited ? 'Favorited' : 'Favorite'}</span>
    </button>
  );
}

function PostCard({ item, onFavoriteChanged }) {
  const router = useRouter();
  const isLocked = !item.canView;

  const handleUnlock = async () => {
    const plain = prompt('Enter password for this post (will be hashed and stored locally):');
    if (!plain) return;
    const hex = await sha256Hex(plain);
    sessionStorage.setItem(`view:post:${item.postId}`, hex); // new key
    sessionStorage.setItem(`view:${item.postId}`, hex);      // old key (compat)
    router.push(`/posts/${item.id}?postId=${encodeURIComponent(item.postId)}`);
  };

  return (
    <div className="rounded-2xl border p-4 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-sm text-gray-500">{item.postId}</div>
        <div className="text-lg font-semibold truncate">{item.title || '(no title)'}</div>
        <div className="text-xs text-gray-500 mt-1">
          {item.viewPolicy} ・ {new Date(item.createdAt).toLocaleString()}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <FavoriteButton
          postPkId={item.id}
          initialFavorited={item.isFavorited}
          onChanged={onFavoriteChanged}
        />
        {isLocked ? (
          <button onClick={handleUnlock} className="rounded-xl border px-3 py-1 text-sm">Unlock</button>
        ) : (
          <Link href={`/posts/${item.id}`} className="rounded-xl border px-3 py-1 text-sm">View</Link>
        )}
      </div>
    </div>
  );
}

export default function ViewAllPostsPage() {
  const { user, authReady } = useAuth();
  const [tab, setTab] = useState('favorites'); // 'favorites' | 'owner'
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const lastFetchKeyRef = useRef(''); // de-dupe key

  const fetchList = async (nextTab = tab) => {
    setLoading(true);
    try {
      if (nextTab === 'favorites') {
        if (!user) { setItems([]); return; }           // 未ログインは叩かない
        const data = await api('/api/favorites/mine');
        setItems(data.items || []);
      } else {
        if (!user) { setItems([]); return; }           // 未ログインは叩かない
        const data = await api('/api/posts/my?ownerOnly=1'); // posts.js に追加したエンドポイント
        setItems(data.items || []);
      }
    } catch (e) {
     // 401は想定内（未ログイン）。アラートは出さない
     if (String(e.message).includes('401')) {
       setItems([]);
     } else {
       console.error(e);
     }
    } finally {
      setLoading(false);
    }
  };

  // 認証状態が確定してから、かつ同じ条件で二重発火しないようにデドupe
  useEffect(() => {
    if (!authReady) return;
    const key = `${user ? user.id : 'guest'}:${tab}`;
    if (lastFetchKeyRef.current === key) return;
    lastFetchKeyRef.current = key;
    if (!user) { setItems([]); return; }
    fetchList(tab);
  }, [tab, authReady, user]);

  const emptyText = useMemo(
    () => tab === 'favorites' ? 'No favorites yet.' : 'No owner-only posts found.',
    [tab]
  );

  return (
    <div className="mx-auto max-w-3xl p-4 space-y-4">
      <h1 className="text-2xl font-bold">View all posts</h1>

      <div className="flex gap-2">
        <button
          onClick={() => setTab('favorites')}
          className={`rounded-xl px-3 py-1 border ${tab==='favorites' ? 'bg-gray-100' : ''}`}
        >Favorites</button>
        <button
          onClick={() => setTab('owner')}
          className={`rounded-xl px-3 py-1 border ${tab==='owner' ? 'bg-gray-100' : ''}`}
        >My Owner-only</button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-gray-500">{emptyText}</div>
      ) : (
        <div className="space-y-3">
          {items.map(it => (
            <PostCard key={it.id} item={it} onFavoriteChanged={() => {}} />
          ))}
        </div>
      )}
    </div>
  );
}
