// pages/feedback/view/index.js
import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { API_BASE } from '../../../lib/apiBase';

const STATUS_STYLE = {
  '未回答':  'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
  '保留':    'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  '回答済み':'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
};

function loadTokens() {
  try {
    const arr = JSON.parse(localStorage.getItem('feedback:tokens') || '[]');
    // 旧形式との互換性
    const single = localStorage.getItem('feedback:viewToken');
    if (single && !arr.includes(single)) arr.push(single);
    return arr;
  } catch { return []; }
}

export default function FeedbackListPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tokens = loadTokens();
    if (tokens.length === 0) { setLoading(false); return; }

    Promise.all(
      tokens.map(token =>
        fetch(`${API_BASE}/api/feedback/view/${token}`, { credentials: 'include' })
          .then(r => r.ok ? r.json() : null)
          .then(data => data ? { ...data, token } : null)
          .catch(() => null)
      )
    ).then(results => {
      setItems(
        results
          .filter(Boolean)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      );
    }).finally(() => setLoading(false));
  }, []);

  return (
    <>
    <Head><title>応答状況 | Post Share</title></Head>
    <main className="max-w-2xl mx-auto px-5 py-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-primary">応答状況</h1>
        <Link href="/feedback" className="btn-ghost btn-sm">お問い合わせする</Link>
      </div>

      {loading ? (
        <p className="text-secondary text-sm">読み込み中…</p>
      ) : items.length === 0 ? (
        <div className="card p-8 text-center space-y-3">
          <p className="text-secondary text-sm">お問い合わせ履歴がありません</p>
          <Link href="/feedback" className="btn-primary btn-sm inline-block">お問い合わせする</Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted w-10">No</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted">タイトル</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted w-28">日付</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted w-24">応答状況</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {items.map((item, i) => (
                <tr key={item.token} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 text-muted text-xs">{i + 1}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/feedback/view/${item.token}`}
                      className="text-primary hover:underline font-medium"
                    >
                      {item.title || (item.message ? item.message.slice(0, 30) + (item.message.length > 30 ? '…' : '') : '(内容なし)')}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-secondary text-xs whitespace-nowrap">
                    {new Date(item.createdAt).toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[item.status] || STATUS_STYLE['未回答']}`}>
                      {item.status || '未回答'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
    </>
  );
}
