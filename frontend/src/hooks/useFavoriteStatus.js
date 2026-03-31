import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function useFavoriteStatus(postPkId) {
  const [favorited, setFavorited] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!postPkId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await apiGet('/api/favorites/mine');
        if (!cancelled) {
          const list = data?.items || [];
          setFavorited(list.some(x => x.id === Number(postPkId)));
        }
      } catch {
        // 未ログインなどは無視（ボタンは動的に反映される）
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [postPkId]);

  const setByToggle = (next) => setFavorited(!!next);
  return { favorited, loading, setByToggle };
}
