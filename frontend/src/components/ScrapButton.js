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

export default function ScrapButton({ postPkId, postPassword, initialScrapped, onChanged }) {
  const [scrapped, setScrapped] = useState(!!initialScrapped);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (!scrapped) {
        await api('/api/scraps', {
          method: 'POST',
          body: JSON.stringify({ postId: postPkId, postPassword: postPassword || null }),
        });
        setScrapped(true);
        onChanged?.(true);
      } else {
        await api(`/api/scraps/${postPkId}`, { method: 'DELETE' });
        setScrapped(false);
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
        ${scrapped
          ? 'border-orange-500/70 text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 active:bg-orange-500/30'
          : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-orange-500/60 hover:text-orange-400 hover:bg-orange-500/10 active:bg-orange-500/20'
        }`}
      title={scrapped ? 'スクラップを解除' : 'スクラップに追加'}
    >
      <span>{scrapped ? '📌' : '📎'}</span>
      <span>{scrapped ? 'スクラップ済' : 'スクラップ'}</span>
    </button>
  );
}
