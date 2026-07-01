// pages/feedback/view/[token].js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { API_BASE } from '../../../lib/apiBase';

const STATUS_STYLE = {
  '未回答': 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
  '保留':   'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  '回答済み':'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
};

export default function ContactViewPage() {
  const router = useRouter();
  const { token } = router.query;
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/feedback/view/${token}`, { credentials: 'include' })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setItem)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <main className="page-wrap"><p className="text-secondary text-sm">読み込み中…</p></main>;
  if (error)   return <main className="page-wrap"><p className="text-error">見つかりませんでした</p></main>;
  if (!item)   return null;

  const statusStyle = STATUS_STYLE[item.status] || STATUS_STYLE['未回答'];

  return (
    <main className="max-w-lg mx-auto px-5 py-16 space-y-6">
      <h1 className="text-2xl font-bold text-primary">応答状況</h1>

      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">{new Date(item.createdAt).toLocaleString()}</span>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusStyle}`}>
            {item.status}
          </span>
        </div>
        {item.title && (
          <div>
            <p className="text-xs text-muted mb-1">タイトル</p>
            <p className="text-primary font-semibold text-sm">{item.title}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-muted mb-1">お問い合わせ内容</p>
          <p className="text-secondary text-sm whitespace-pre-wrap">{item.message}</p>
        </div>
      </div>

      {item.reply ? (
        <div className="card p-5 space-y-2 border-brand/30">
          <p className="text-xs font-semibold text-brand">回答</p>
          <p className="text-secondary text-sm whitespace-pre-wrap">{item.reply}</p>
          {item.repliedAt && (
            <p className="text-xs text-muted">{new Date(item.repliedAt).toLocaleString()}</p>
          )}
        </div>
      ) : (
        <p className="text-secondary text-sm text-center">まだ回答はありません</p>
      )}
    </main>
  );
}
