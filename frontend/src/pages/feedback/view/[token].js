// pages/feedback/view/[token].js
import Head from 'next/head';
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
      .then(async r => {
        if (r.status === 404) throw new Error('お問い合わせが見つかりませんでした');
        if (!r.ok) throw new Error(`サーバーエラーが発生しました（${r.status}）`);
        return r.json();
      })
      .then(setItem)
      .catch(e => setError(e.message || 'ネットワークエラーが発生しました'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <main className="page-wrap"><p className="text-secondary text-sm">読み込み中…</p></main>;
  if (error)   return <main className="page-wrap"><p className="text-error">{error}</p></main>;
  if (!item)   return null;

  const statusStyle = STATUS_STYLE[item.status] || STATUS_STYLE['未回答'];

  return (
    <>
    <Head><title>応答状況 | Post Share</title></Head>
    <main className="max-w-lg mx-auto px-5 py-16 space-y-6">
      <h1 className="text-2xl font-bold text-primary">応答状況</h1>

      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">{new Date(item.createdAt).toLocaleString()}</span>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusStyle}`}>
            {item.status}
          </span>
        </div>

        {/* 送信内容 */}
        <div className="space-y-1.5">
          {item.title && (
            <p className="text-base font-semibold text-primary">{item.title}</p>
          )}
          {item.message && (
            <p className="text-secondary text-sm whitespace-pre-wrap">{item.message}</p>
          )}
        </div>

        {/* 回答 */}
        {item.reply ? (
          <>
            <div className="border-t border-gray-200 dark:border-gray-700" />
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-brand">回答</p>
              <p className="text-secondary text-sm whitespace-pre-wrap">{item.reply}</p>
              {item.repliedAt && (
                <p className="text-xs text-muted">{new Date(item.repliedAt).toLocaleString()}</p>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="border-t border-gray-200 dark:border-gray-700" />
            <p className="text-secondary text-sm">まだ回答はありません</p>
          </>
        )}
      </div>
    </main>
    </>
  );
}
