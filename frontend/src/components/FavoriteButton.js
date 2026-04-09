import { useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.headers.get('content-type')?.includes('application/json') ? res.json() : null;
}

export default function FavoriteButton({ postPkId, initialFavorited, onChanged }) {
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
      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium
        border transition-colors cursor-pointer select-none disabled:opacity-50
        ${favorited
          ? 'border-yellow-500/70 text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20 active:bg-yellow-500/30'
          : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-yellow-500/60 hover:text-yellow-400 hover:bg-yellow-500/10 active:bg-yellow-500/20'
        }`}
      title={favorited ? 'お気に入りを解除' : 'お気に入りに追加'}
    >
      <span>{favorited ? '★' : '☆'}</span>
      <span>{favorited ? 'お気に入り済' : 'お気に入り'}</span>
    </button>
  );
}
