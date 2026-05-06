// pages/feedback/admin.js
import Head from 'next/head';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { API_BASE } from '../../lib/apiBase';

const STATUSES = ['未回答', '保留', '回答済み'];

const STATUS_STYLE = {
  '未回答': 'bg-gray-100 dark:bg-gray-800 text-gray-500',
  '保留':   'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  '回答済み':'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
};

function FeedbackItem({ item, onUpdated }) {
  const [reply, setReply] = useState(item.reply || '');
  const [status, setStatus] = useState(item.status || '未回答');
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/feedback/${item.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      onUpdated(data);
      setOpen(false);
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-secondary text-sm whitespace-pre-wrap flex-1">{item.message}</p>
        <span className={`shrink-0 text-xs font-semibold px-3 py-1 rounded-full ${STATUS_STYLE[item.status] || STATUS_STYLE['未回答']}`}>
          {item.status}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">{new Date(item.createdAt).toLocaleString()}</p>
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="btn-ghost btn-xs"
        >
          {open ? '閉じる' : '返信・ステータス'}
        </button>
      </div>

      {item.reply && !open && (
        <div className="surface p-3 text-sm text-secondary whitespace-pre-wrap">
          <span className="text-xs font-semibold text-brand mr-2">回答済み:</span>{item.reply}
        </div>
      )}

      {open && (
        <div className="surface p-4 space-y-3">
          <div>
            <label className="label">ステータス</label>
            <div className="flex gap-2 flex-wrap">
              {STATUSES.map(s => (
                <label key={s} className="radio-label">
                  <input type="radio" name={`status-${item.id}`} value={s} checked={status === s} onChange={() => setStatus(s)} />
                  <span>{s}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="label">返信内容</label>
            <textarea
              className="input min-h-[80px] resize-y"
              value={reply}
              onChange={e => setReply(e.target.value)}
              placeholder="返信を入力（任意）"
            />
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary btn-sm disabled:opacity-60"
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      )}
    </li>
  );
}

export default function FeedbackAdminPage() {
  const { user, authReady } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('すべて');

  useEffect(() => {
    if (!authReady || !user) return;
    setLoading(true);
    fetch(`${API_BASE}/api/feedback`, { credentials: 'include' })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => setItems(data.items || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [authReady, user]);

  const ADMIN_USERNAME = 'park';
  const isAdmin = authReady && user?.username === ADMIN_USERNAME;

  if (authReady && (!user || !isAdmin)) {
    return (
      <main className="page-wrap text-center py-20">
        <p className="text-secondary">このページは存在しません</p>
      </main>
    );
  }

  const displayed = filter === 'すべて' ? items : items.filter(i => i.status === filter);
  const counts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: items.filter(i => i.status === s).length }), {});

  return (
    <>
    <Head><title>意見箱 管理 | Post Share</title></Head>
    <main className="max-w-2xl mx-auto px-5 py-12">
      <h1 className="text-2xl font-bold text-primary mb-6">意見箱 — 管理</h1>

      {/* フィルター */}
      <div className="flex gap-2 flex-wrap mb-6">
        {['すべて', ...STATUSES].map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`btn-sm rounded-full border transition-colors ${
              filter === s
                ? 'border-brand text-brand bg-brand/10'
                : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
            }`}
          >
            {s}
            {s !== 'すべて' && <span className="ml-1 opacity-60">({counts[s] ?? 0})</span>}
            {s === 'すべて' && <span className="ml-1 opacity-60">({items.length})</span>}
          </button>
        ))}
      </div>

      {loading && <p className="text-secondary text-sm">読み込み中…</p>}
      {error && <p className="text-error text-sm">{error}</p>}
      {!loading && displayed.length === 0 && !error && (
        <p className="text-secondary text-sm">該当する意見はありません</p>
      )}

      <ul className="space-y-3">
        {displayed.map(item => (
          <FeedbackItem
            key={item.id}
            item={item}
            onUpdated={updated =>
              setItems(prev => prev.map(i => (i.id === updated.id ? updated : i)))
            }
          />
        ))}
      </ul>
    </main>
    </>
  );
}
