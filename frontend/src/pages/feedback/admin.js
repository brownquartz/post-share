// pages/feedback/admin.js
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../lib/apiBase';

export default function FeedbackAdminPage() {
  const { user, authReady } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authReady || !user) return;
    setLoading(true);
    fetch(`${API_BASE}/api/feedback`, { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => setItems(data.items || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [authReady, user]);

  if (authReady && !user) {
    return (
      <main className="page-wrap text-center py-20">
        <p className="text-secondary mb-4">ログインが必要です</p>
        <Link href="/auth/login" className="btn-primary">ログイン</Link>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-5 py-12">
      <h1 className="text-2xl font-bold text-primary mb-6">意見箱 — 管理</h1>

      {loading && <p className="text-secondary text-sm">読み込み中…</p>}
      {error && <p className="text-error text-sm">{error}</p>}

      {!loading && items.length === 0 && !error && (
        <p className="text-secondary text-sm">まだ意見は届いていません</p>
      )}

      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="card p-4">
            <p className="text-secondary text-sm whitespace-pre-wrap">{item.message}</p>
            <p className="text-xs text-muted mt-2">{new Date(item.createdAt).toLocaleString()}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
