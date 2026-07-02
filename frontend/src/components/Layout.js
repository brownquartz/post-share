// src/components/Layout.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../lib/apiBase';

const ADMIN_USERNAME = 'park';

const TYPE_LABEL = {
  comment:         'コメントが届きました',
  friend_request:  '友だち申請が届きました',
  friend_accepted: '友だち申請が承認されました',
};

// ========== 通知パネル ==========
function NotificationsPanel({ items, onClose, onMarkRead }) {
  useEffect(() => { onMarkRead(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/60">
        <span className="font-bold text-gray-100 text-base">お知らせ</span>
        <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {items.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-400">お知らせはありません</p>
        ) : (
          <ul className="divide-y divide-gray-800">
            {items.map(item => (
              <li key={item.id} className={`px-5 py-3 ${!item.isRead ? 'bg-blue-950/30' : ''}`}>
                <p className="text-sm text-gray-200">{TYPE_LABEL[item.type] || item.type}</p>
                {item.type === 'comment' && item.data?.commenterName && (
                  <p className="text-xs text-gray-400 mt-0.5">{item.data.commenterName} さんがコメントしました</p>
                )}
                {item.type === 'comment' && item.data?.postId && (
                  <Link
                    href={`/posts/${item.data.postId}?aid=${encodeURIComponent(item.data.postTitle || '')}`}
                    onClick={onClose}
                    className="text-xs text-blue-400 hover:underline mt-0.5 block"
                  >
                    投稿を見る →
                  </Link>
                )}
                {item.type === 'friend_request' && item.data?.fromUsername && (
                  <p className="text-xs text-gray-400 mt-0.5">{item.data.fromUsername} さんから</p>
                )}
                {item.type === 'friend_accepted' && item.data?.byUsername && (
                  <p className="text-xs text-gray-400 mt-0.5">{item.data.byUsername} さんが承認しました</p>
                )}
                <p className="text-xs text-gray-600 mt-1">{new Date(item.createdAt).toLocaleString('ja-JP')}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ========== 友だちパネル ==========
function FriendsPanel({ friends, requests, onClose, onReload }) {
  const [username, setUsername] = useState('');
  const [sendMsg, setSendMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSendRequest(e) {
    e.preventDefault();
    if (!username.trim()) return;
    setBusy(true); setSendMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/friends/request`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setSendMsg(data.message || 'エラーが発生しました'); return; }
      setSendMsg('申請を送りました');
      setUsername('');
    } catch { setSendMsg('エラーが発生しました'); }
    finally { setBusy(false); }
  }

  async function handleAccept(id) {
    await fetch(`${API_BASE}/api/friends/${id}/accept`, { method: 'PUT', credentials: 'include' });
    onReload();
  }

  async function handleReject(id) {
    await fetch(`${API_BASE}/api/friends/${id}/reject`, { method: 'PUT', credentials: 'include' });
    onReload();
  }

  async function handleRemove(id) {
    if (!confirm('友だちを解除しますか？')) return;
    await fetch(`${API_BASE}/api/friends/${id}`, { method: 'DELETE', credentials: 'include' });
    onReload();
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/60">
        <span className="font-bold text-gray-100 text-base">友だち</span>
        <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
        {/* 申請を送る */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">申請を送る</p>
          <form onSubmit={handleSendRequest} className="flex gap-2">
            <input
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
              placeholder="ユーザー名"
              value={username}
              onChange={e => { setUsername(e.target.value); setSendMsg(''); }}
            />
            <button type="submit" disabled={busy} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg disabled:opacity-60 transition-colors">
              申請する
            </button>
          </form>
          {sendMsg && <p className="text-xs mt-1.5 text-blue-400">{sendMsg}</p>}
        </div>

        {/* 受信した申請 */}
        {requests.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">受信した申請 ({requests.length})</p>
            <ul className="space-y-2">
              {requests.map(r => (
                <li key={r.id} className="flex items-center justify-between gap-2 bg-gray-800 rounded-lg px-3 py-2">
                  <span className="text-sm text-gray-200">{r.fromUsername}</span>
                  <div className="flex gap-1.5">
                    <button onClick={() => handleAccept(r.id)} className="px-2 py-1 bg-green-700 hover:bg-green-600 text-white text-xs rounded transition-colors">承認</button>
                    <button onClick={() => handleReject(r.id)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors">拒否</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 友だち一覧 */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">友だち ({friends.length})</p>
          {friends.length === 0 ? (
            <p className="text-sm text-gray-500">まだ友だちがいません</p>
          ) : (
            <ul className="space-y-2">
              {friends.map(f => (
                <li key={f.id} className="flex items-center justify-between gap-2 bg-gray-800 rounded-lg px-3 py-2">
                  <span className="text-sm text-gray-200">{f.username}</span>
                  <button onClick={() => handleRemove(f.id)} className="text-xs text-gray-500 hover:text-red-400 transition-colors">解除</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ========== 左ドロワー（ナビ） ==========
function Drawer({ isOpen, onClose, user, authReady, signOut, toggleTheme, isDark }) {
  const { pathname } = useRouter();
  const isAdmin = !!user && user.username === ADMIN_USERNAME;
  const [feedbackToken, setFeedbackToken] = React.useState('');

  React.useEffect(() => {
    try {
      const tokens = JSON.parse(localStorage.getItem('feedback:tokens') || '[]');
      if (tokens.length > 0) { setFeedbackToken('yes'); return; }
      if (localStorage.getItem('feedback:viewToken')) setFeedbackToken('yes');
    } catch {}
  }, []);

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/posts/view', label: '検索' },
    { href: '/posts/new', label: '投稿' },
    { href: '/purpose', label: '目的' },
    { href: '/feedback', label: 'お問い合わせ' },
    ...(feedbackToken ? [{ href: '/feedback/view', label: '応答状況' }] : []),
    ...(user ? [
      { href: '/posts/view-all', label: 'My Posts' },
      { href: '/friends', label: '友だちの投稿' },
    ] : []),
    ...(isAdmin ? [{ href: '/feedback/admin', label: '管理', admin: true }] : []),
  ];

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-30 bg-black/50" onClick={onClose} />}
      <div className={`fixed top-0 left-0 z-40 h-full w-64 bg-gray-900 border-r border-gray-700/60
                      flex flex-col transition-transform duration-300 ease-in-out
                      ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/60">
          <span className="font-bold text-brand text-lg tracking-tight">Post Share</span>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors" aria-label="Close menu">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map(({ href, label, admin }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                  ${active ? 'bg-brand/15 text-brand'
                    : admin ? 'text-yellow-400 hover:bg-gray-800 hover:text-yellow-300'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-gray-100'}`}
              >
                {admin && <span className="text-xs">⚙</span>}
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-700/60 px-3 py-4 space-y-2">
          <button type="button" onClick={() => { toggleTheme(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:bg-gray-800 hover:text-gray-100 transition-colors">
            <span>{isDark ? '☀️' : '🌙'}</span>
            <span>{isDark ? 'ライトモード' : 'ダークモード'}</span>
          </button>
          {!authReady ? null : user ? (
            <>
              <div className="px-3 py-2 text-xs text-gray-500">
                ログイン中: <span className="text-gray-300 font-medium">{user.username}</span>
              </div>
              <button type="button" onClick={() => { signOut(); onClose(); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:bg-gray-800 hover:text-gray-100 transition-colors">
                ログアウト
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" onClick={onClose} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:bg-gray-800 hover:text-gray-100 transition-colors">ログイン</Link>
              <Link href="/auth/signup" onClick={onClose} className="flex items-center justify-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold bg-brand text-white hover:bg-brand-600 transition-colors">新規登録</Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ========== 右スライドパネル ==========
function RightPanel({ type, onClose, notifItems, friends, friendRequests, onMarkRead, onReloadFriends }) {
  if (!type) return null;
  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/50" onClick={onClose} />
      <div className="fixed top-0 right-0 z-40 h-full w-80 bg-gray-900 border-l border-gray-700/60 flex flex-col">
        {type === 'notifications' && (
          <NotificationsPanel items={notifItems} onClose={onClose} onMarkRead={onMarkRead} />
        )}
        {type === 'friends' && (
          <FriendsPanel friends={friends} requests={friendRequests} onClose={onClose} onReload={onReloadFriends} />
        )}
      </div>
    </>
  );
}

// ========== Layout ==========
export default function Layout({ children, toggleTheme, isDark }) {
  const { user, authReady, signOut } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [rightPanel, setRightPanel] = useState(null); // 'notifications' | 'friends' | null

  // ---- キャッシュ済みデータ ----
  const [notifItems, setNotifItems]       = useState([]);
  const [friends, setFriends]             = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);

  const unreadCount = useMemo(() => notifItems.filter(i => !i.isRead).length, [notifItems]);

  // 通知のみ再取得（30秒ポーリング用）
  const reloadNotifs = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/notifications`, { credentials: 'include' });
      if (res.ok) { const d = await res.json(); setNotifItems(d.items || []); }
    } catch {}
  }, []);

  // 友だち＋申請を再取得（承認/拒否/解除後）
  const reloadFriends = useCallback(async () => {
    try {
      const [fRes, rRes] = await Promise.all([
        fetch(`${API_BASE}/api/friends`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/friends/requests`, { credentials: 'include' }),
      ]);
      if (fRes.ok) { const d = await fRes.json(); setFriends(d.items || []); }
      if (rRes.ok) { const d = await rRes.json(); setFriendRequests(d.items || []); }
    } catch {}
  }, []);

  // ログイン直後に全データを一括取得
  useEffect(() => {
    if (!user) {
      setNotifItems([]); setFriends([]); setFriendRequests([]);
      return;
    }
    // 初回一括取得
    Promise.all([
      fetch(`${API_BASE}/api/notifications`, { credentials: 'include' }),
      fetch(`${API_BASE}/api/friends`, { credentials: 'include' }),
      fetch(`${API_BASE}/api/friends/requests`, { credentials: 'include' }),
    ]).then(async ([nRes, fRes, rRes]) => {
      if (nRes.ok) { const d = await nRes.json(); setNotifItems(d.items || []); }
      if (fRes.ok) { const d = await fRes.json(); setFriends(d.items || []); }
      if (rRes.ok) { const d = await rRes.json(); setFriendRequests(d.items || []); }
    }).catch(() => {});

    // 通知は30秒ごとに更新
    const timer = setInterval(reloadNotifs, 30000);
    return () => clearInterval(timer);
  }, [user, reloadNotifs]);

  // 通知パネルを開いたとき → 既読APIを叩いてローカルも既読に
  const handleMarkRead = useCallback(() => {
    fetch(`${API_BASE}/api/notifications/read`, { method: 'PUT', credentials: 'include' }).catch(() => {});
    setNotifItems(prev => prev.map(i => ({ ...i, isRead: true })));
  }, []);

  function openPanel(type) {
    setRightPanel(prev => prev === type ? null : type);
  }

  return (
    <div className="page-bg flex flex-col">
      <nav className="header-bar flex items-center justify-between px-5 py-3 sticky top-0 z-10">
        {/* ハンバーガー */}
        <button type="button" onClick={() => setDrawerOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-300 hover:text-gray-100 hover:bg-gray-800 transition-colors cursor-pointer" aria-label="Open menu">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>

        <Link href="/" className="brand-link text-lg tracking-tight">Post Share</Link>

        {/* 右側ボタン群 */}
        <div className="flex items-center gap-1">
          {/* ベル（お知らせ） */}
          {user && (
            <button type="button" onClick={() => openPanel('notifications')}
              className="relative w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors cursor-pointer"
              aria-label="お知らせ">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          )}

          {/* 友だちボタン */}
          {user && (
            <button type="button" onClick={() => openPanel('friends')}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors cursor-pointer"
              aria-label="友だち">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </button>
          )}

          {/* テーマ切替 */}
          <button type="button" onClick={toggleTheme}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors cursor-pointer"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
            {isDark ? '☀' : '🌙'}
          </button>
        </div>
      </nav>

      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)}
        user={user} authReady={authReady} signOut={signOut}
        toggleTheme={toggleTheme} isDark={isDark} />

      <RightPanel
        type={rightPanel}
        onClose={() => setRightPanel(null)}
        notifItems={notifItems}
        friends={friends}
        friendRequests={friendRequests}
        onMarkRead={handleMarkRead}
        onReloadFriends={reloadFriends}
      />

      <main className="flex-1">{children}</main>

      <footer className="border-t border-gray-200 dark:border-gray-800 text-center py-3 text-xs text-gray-400 dark:text-gray-600">
        © 2025 Post Share
      </footer>
    </div>
  );
}
