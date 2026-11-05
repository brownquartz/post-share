// pages/scraps.js
import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import CryptoJS from 'crypto-js';
import DOMPurify from 'dompurify';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../lib/apiBase';

function decryptContent(encryptedContent, postPasswordHash) {
  if (!postPasswordHash || !encryptedContent) return encryptedContent || '';
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedContent, postPasswordHash);
    const html = bytes.toString(CryptoJS.enc.Utf8);
    return html || encryptedContent;
  } catch {
    return '';
  }
}

export default function ScrapsPage() {
  const { user, authReady } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authReady || !user) { setLoading(false); return; }
    fetch(`${API_BASE}/api/scraps/mine`, { credentials: 'include' })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => setItems(d.items || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [authReady, user]);

  const handleRemove = async (postNumericId) => {
    try {
      await fetch(`${API_BASE}/api/scraps/${postNumericId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      setItems(prev => prev.filter(s => s.id !== postNumericId));
    } catch (e) {
      alert(e.message);
    }
  };

  if (authReady && !user) {
    return (
      <main className="page-wrap text-center py-20">
        <p className="text-secondary mb-4">ログインが必要です</p>
        <Link href="/auth/login" className="btn-primary">ログイン</Link>
      </main>
    );
  }

  return (
    <>
    <Head><title>スクラップ | Post Share</title></Head>
    <main className="page-wrap">
      <h1 className="page-title">スクラップ</h1>

      {loading ? (
        <p className="text-secondary text-sm">読み込み中…</p>
      ) : error ? (
        <p className="text-error text-sm">{error}</p>
      ) : items.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-secondary text-sm">スクラップはまだありません</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map(scrap => {
            const decrypted = decryptContent(scrap.content, scrap.postPassword);
            const sanitized = typeof window !== 'undefined' && decrypted
              ? DOMPurify.sanitize(decrypted)
              : decrypted;

            return (
              <li key={scrap.id} className="card p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/posts/${scrap.id}?aid=${encodeURIComponent(scrap.postStringId || '')}`}
                      className="font-semibold text-brand hover:underline text-lg"
                    >
                      {scrap.title || `(タイトルなし #${scrap.id})`}
                    </Link>
                    {scrap.expiresAt && (
                      <p className="text-xs text-muted mt-0.5">
                        有効期限: {new Date(scrap.expiresAt).toLocaleString('ja-JP')}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemove(scrap.id)}
                    className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-xl border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    削除
                  </button>
                </div>

                {sanitized ? (
                  <article
                    className="prose dark:prose-invert max-w-none text-sm"
                    dangerouslySetInnerHTML={{ __html: sanitized }}
                  />
                ) : (
                  <p className="text-xs text-muted">（内容を表示できません）</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
    </>
  );
}
