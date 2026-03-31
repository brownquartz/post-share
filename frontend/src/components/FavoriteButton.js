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
      className={`inline-flex items-center gap-1 rounded-2xl px-3 py-1 border text-sm
        ${favorited ? 'border-yellow-500' : 'border-gray-400'}`}
      title={favorited ? 'Unfavorite' : 'Favorite'}
    >
      <span>{favorited ? '★' : '☆'}</span>
      <span>{favorited ? 'Favorited' : 'Favorite'}</span>
    </button>
  );
}