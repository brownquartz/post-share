// pages/feedback/index.js
import { useState } from 'react';
import { API_BASE } from '../../lib/apiBase';

export default function FeedbackPage() {
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true); setError('');
    try {
      const res = await fetch(`${API_BASE}/api/feedback`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `エラー (${res.status})`);
      setDone(true);
      setMessage('');
    } catch (e) {
      setError(e.message || 'エラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-lg mx-auto px-5 py-16">
      <h1 className="text-3xl font-bold text-primary mb-2">意見箱</h1>
      <p className="text-secondary text-sm mb-8">
        使ってみて気になったこと、改善してほしいことなど、なんでも書いてください。匿名で送れます。
      </p>

      {done ? (
        <div className="card p-6 text-center space-y-3">
          <p className="text-2xl">✅</p>
          <p className="font-semibold text-primary">送信しました。ありがとうございます！</p>
          <button
            type="button"
            onClick={() => setDone(false)}
            className="btn-ghost btn-sm"
          >
            続けて送る
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">メッセージ</label>
            <textarea
              className="input min-h-[140px] resize-y"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="ここに書いてください…"
              required
            />
          </div>
          {error && <p className="text-error text-sm">{error}</p>}
          <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-60">
            {submitting ? '送信中…' : '送信する'}
          </button>
        </form>
      )}
    </main>
  );
}
