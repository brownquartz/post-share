// pages/settings.js
import Head from 'next/head';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../lib/apiBase';

function Section({ title, children }) {
  return (
    <div className="card p-6 space-y-4">
      <h2 className="text-base font-semibold text-primary border-b border-gray-200 dark:border-gray-700 pb-2">{title}</h2>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { user, authReady, signOut } = useAuth();
  const router = useRouter();

  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwOk, setPwOk] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);

  const [newUsername, setNewUsername] = useState('');
  const [unPw, setUnPw] = useState('');
  const [unMsg, setUnMsg] = useState('');
  const [unOk, setUnOk] = useState(false);
  const [unBusy, setUnBusy] = useState(false);

  if (authReady && !user) {
    router.replace('/auth/login');
    return null;
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    setPwBusy(true); setPwMsg(''); setPwOk(false);
    try {
      const res = await fetch(`${API_BASE}/api/auth/password`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: curPw, newPassword: newPw }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setPwMsg(d.message || 'エラーが発生しました'); return; }
      setPwOk(true); setPwMsg('パスワードを変更しました');
      setCurPw(''); setNewPw('');
    } catch { setPwMsg('エラーが発生しました'); }
    finally { setPwBusy(false); }
  }

  async function handleUsernameChange(e) {
    e.preventDefault();
    setUnBusy(true); setUnMsg(''); setUnOk(false);
    try {
      const res = await fetch(`${API_BASE}/api/auth/username`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newUsername, currentPassword: unPw }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setUnMsg(d.message || 'エラーが発生しました'); return; }
      setUnOk(true); setUnMsg(`ユーザー名を「${d.username}」に変更しました。再ログインしてください`);
      setNewUsername(''); setUnPw('');
      setTimeout(() => { signOut(); router.push('/auth/login'); }, 2000);
    } catch { setUnMsg('エラーが発生しました'); }
    finally { setUnBusy(false); }
  }

  return (
    <>
    <Head><title>設定 | Post Share</title></Head>
    <main className="page-wrap-sm space-y-6 py-10">
      <h1 className="page-title">設定</h1>

      {user && (
        <p className="text-sm text-muted -mt-4">ログイン中: <span className="font-medium text-primary">{user.username}</span></p>
      )}

      <Section title="パスワード変更">
        <form onSubmit={handlePasswordChange} className="space-y-3">
          <div>
            <label className="label">現在のパスワード</label>
            <input type="password" className="input" value={curPw} onChange={e => setCurPw(e.target.value)} required />
          </div>
          <div>
            <label className="label">新しいパスワード</label>
            <input type="password" className="input" value={newPw} onChange={e => setNewPw(e.target.value)} required minLength={4} />
          </div>
          {pwMsg && <p className={`text-sm ${pwOk ? 'text-green-500' : 'text-error'}`}>{pwMsg}</p>}
          <button type="submit" disabled={pwBusy} className="btn-primary disabled:opacity-60">
            {pwBusy ? '変更中…' : '変更する'}
          </button>
        </form>
      </Section>

      <Section title="ユーザー名変更">
        <form onSubmit={handleUsernameChange} className="space-y-3">
          <div>
            <label className="label">新しいユーザー名</label>
            <input type="text" className="input" value={newUsername} onChange={e => setNewUsername(e.target.value)} required pattern="[a-zA-Z0-9_\-]{2,30}" title="2〜30文字の英数字・_・-" />
            <p className="text-xs text-muted mt-1">2〜30文字、英数字・_・- のみ</p>
          </div>
          <div>
            <label className="label">現在のパスワード（確認）</label>
            <input type="password" className="input" value={unPw} onChange={e => setUnPw(e.target.value)} required />
          </div>
          {unMsg && <p className={`text-sm ${unOk ? 'text-green-500' : 'text-error'}`}>{unMsg}</p>}
          <button type="submit" disabled={unBusy} className="btn-primary disabled:opacity-60">
            {unBusy ? '変更中…' : '変更する'}
          </button>
        </form>
      </Section>
    </main>
    </>
  );
}
