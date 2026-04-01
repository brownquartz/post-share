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
      className={`btn btn-xs focus-ring ${
        favorited
          ? 'border border-yellow-500/70 text-yellow-400 hover:bg-yellow-500/10'
          : 'btn-secondary'
      }`}
      title={favorited ? 'Unfavorite' : 'Favorite'}
    >
      {favorited ? '★ Favorited' : '☆ Favorite'}
    </button>
  );
}

function PostCard({ item, onFavoriteChanged }) {
  const router = useRouter();
  const isLocked = !item.canView;

  const handleUnlock = async () => {
    const plain = prompt('Enter password for this post:');
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
        <div className="font-semibold text-primary truncate">{item.title || '(no title)'}</div>
        <div className="text-xs text-secondary mt-0.5">
          {item.viewPolicy} · {new Date(item.createdAt).toLocaleString()}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <FavoriteButton postPkId={item.id} initialFavorited={item.isFavorited} onChanged={onFavoriteChanged} />
        {isLocked ? (
          <button onClick={handleUnlock} className="btn-ghost btn-xs">Unlock</button>
        ) : (
          <Link href={`/posts/${item.id}?aid=${encodeURIComponent(item.postId)}`} className="btn-primary btn-xs">View</Link>
        )}
      </div>
    </div>
  );
}

export default function ViewAllPostsPage() {
  const { user, authReady } = useAuth();
  const [tab, setTab] = useState('favorites');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const lastFetchKeyRef = useRef('');

  const fetchList = async (nextTab = tab) => {
    setLoading(true);
    try {
      if (nextTab === 'favorites') {
        if (!user) { setItems([]); return; }
        const data = await api('/api/favorites/mine');
        setItems(data.items || []);
      } else {
        if (!user) { setItems([]); return; }
        const data = await api('/api/posts/my?ownerOnly=1');
        setItems(data.items || []);
      }
    } catch (e) {
      if (String(e.message).includes('401')) { setItems([]); }
      else { console.error(e); }
    } finally {
      setLoading(false);
    }
  };

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
    <main className="page-wrap pt-10">
      <h1 className="page-title">My Posts</h1>

      <div className="flex gap-2 mb-6">
        {['favorites', 'owner'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`btn focus-ring ${tab === t ? 'btn-solid-brand' : 'btn-secondary'}`}
          >
            {t === 'favorites' ? '★ Favorites' : 'Owner-only'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-secondary text-sm">Loading…</p>
      ) : items.length === 0 ? (
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
