import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

export function useScrapStatus(postPkId) {
  const [scrapped, setScrapped] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!postPkId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/scraps/mine`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          const list = data?.items || [];
          setScrapped(list.some(x => x.id === Number(postPkId)));
        }
      } catch {
        // 未ログインなどは無視
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [postPkId]);

  const setByToggle = (next) => setScrapped(!!next);
  return { scrapped, loading, setByToggle };
}
