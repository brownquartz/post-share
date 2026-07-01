// pages/feedback/index.js
import Head from 'next/head';
import { useState } from 'react';
import Link from 'next/link';
import { API_BASE } from '../../lib/apiBase';

export default function ContactPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [viewToken, setViewToken] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() && !message.trim()) {
      setError('タイトルか内容のどちらかを入力してください');
      return;
    }
    setSubmitting(true); setError('');
    try {
      const res = await fetch(`${API_BASE}/api/feedback`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message, email: email || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `エラー (${res.status})`);
      try { localStorage.setItem('feedback:viewToken', data.viewToken); } catch {}
      setViewToken(data.viewToken);
      setTitle(''); setMessage(''); setEmail('');
    } catch (e) {
      setError(e.message || 'エラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  }

  if (viewToken) {
    const viewUrl = `/feedback/view/${viewToken}`;
    return (
      <main className="max-w-lg mx-auto px-5 py-16">
        <div className="card p-6 space-y-4">
          <p className="text-2xl text-center">✅</p>
          <p className="font-semibold text-primary text-center">送信しました。ありがとうございます！</p>
          <p className="text-secondary text-sm">
            下のリンクから、いつでも応答状況を確認できます。このURLを保存しておいてください。
          </p>
          <div className="surface p-3 rounded-lg break-all text-xs text-secondary font-mono">
            {typeof window !== 'undefined' ? window.location.origin : ''}{viewUrl}
          </div>
          <div className="flex gap-2">
            <Link href={viewUrl} className="btn-primary flex-1 text-center">応答状況を確認する</Link>
            <button
              type="button"
              onClick={() => setViewToken('')}
              className="btn-ghost"
            >
              続けて送る
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
    <Head><title>お問い合わせ | Post Share</title></Head>
    <main className="max-w-lg mx-auto px-5 py-16">
      <h1 className="text-3xl font-bold text-primary mb-2">お問い合わせ</h1>
      <p className="text-secondary text-sm mb-8">
        気になること・改善してほしいことなど、お気軽にご連絡ください。匿名でも送れます。
        送信後に応答状況確認用のリンクが発行されます。
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">タイトル</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="件名を入力してください（任意）"
          />
        </div>
        <div>
          <label className="label">内容</label>
          <textarea
            className="input min-h-[140px] resize-y"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="ここに書いてください…"
          />
        </div>
        <div>
          <label className="label">メールアドレス <span className="text-muted text-xs">任意</span></label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="返信を希望する場合はご入力ください"
          />
        </div>
        {error && <p className="text-error text-sm">{error}</p>}
        <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-60">
          {submitting ? '送信中…' : '送信する'}
        </button>
      </form>
    </main>
    </>
  );
}
