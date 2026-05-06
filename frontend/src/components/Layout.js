// src/components/Layout.js
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

const ADMIN_USERNAME = 'park';

function Drawer({ isOpen, onClose, user, authReady, signOut, toggleTheme, isDark }) {
  const { pathname } = useRouter();
  const isAdmin = !!user && user.username === ADMIN_USERNAME;

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/posts/view', label: '検索' },
    { href: '/posts/new', label: '投稿' },
    { href: '/purpose', label: '目的' },
    { href: '/feedback', label: '意見箱' },
    ...(user ? [{ href: '/posts/view-all', label: 'My Posts' }] : []),
    ...(isAdmin ? [{ href: '/feedback/admin', label: '管理', admin: true }] : []),
  ];

  const handleLinkClick = () => onClose();

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50"
          onClick={onClose}
        />
      )}

      {/* Drawer panel */}
      <div
        className={`fixed top-0 left-0 z-40 h-full w-64 bg-gray-900 border-r border-gray-700/60
                    flex flex-col transition-transform duration-300 ease-in-out
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/60">
          <span className="font-bold text-brand text-lg tracking-tight">Post Share</span>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors"
            aria-label="Close menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map(({ href, label, admin }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={handleLinkClick}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                  ${active
                    ? 'bg-brand/15 text-brand'
                    : admin
                      ? 'text-yellow-400 hover:bg-gray-800 hover:text-yellow-300'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-gray-100'
                  }`}
              >
                {admin && <span className="text-xs">⚙</span>}
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section: theme + auth */}
        <div className="border-t border-gray-700/60 px-3 py-4 space-y-2">
          {/* Theme toggle */}
          <button
            type="button"
            onClick={() => { toggleTheme(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:bg-gray-800 hover:text-gray-100 transition-colors"
          >
            <span>{isDark ? '☀️' : '🌙'}</span>
            <span>{isDark ? 'ライトモード' : 'ダークモード'}</span>
          </button>

          {/* Auth */}
          {!authReady ? null : user ? (
            <>
              <div className="px-3 py-2 text-xs text-gray-500">
                ログイン中: <span className="text-gray-300 font-medium">{user.username}</span>
              </div>
              <button
                type="button"
                onClick={() => { signOut(); onClose(); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:bg-gray-800 hover:text-gray-100 transition-colors"
              >
                ログアウト
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login"  onClick={handleLinkClick} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:bg-gray-800 hover:text-gray-100 transition-colors">ログイン</Link>
              <Link href="/auth/signup" onClick={handleLinkClick} className="flex items-center justify-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold bg-brand text-white hover:bg-brand-600 transition-colors">新規登録</Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default function Layout({ children, toggleTheme, isDark }) {
  const { user, authReady, signOut } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="page-bg flex flex-col">
      <nav className="header-bar flex items-center justify-between px-5 py-3 sticky top-0 z-10">
        {/* Hamburger button */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-300 hover:text-gray-100 hover:bg-gray-800 transition-colors cursor-pointer"
          aria-label="Open menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>

        <Link href="/" className="brand-link text-lg tracking-tight">Post Share</Link>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors cursor-pointer"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? '☀' : '🌙'}
        </button>
      </nav>

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        user={user}
        authReady={authReady}
        signOut={signOut}
        toggleTheme={toggleTheme}
        isDark={isDark}
      />

      <main className="flex-1">{children}</main>

      <footer className="border-t border-gray-200 dark:border-gray-800 text-center py-3 text-xs text-gray-400 dark:text-gray-600">
        © 2025 Post Share
      </footer>
    </div>
  );
}
