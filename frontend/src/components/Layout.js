// src/components/Layout.js
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

function BottomNav({ user }) {
  const { pathname } = useRouter();

  const items = [
    {
      href: '/',
      label: 'Home',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V21a.75.75 0 01-.75.75H15.75V15h-7.5v6.75H3.75A.75.75 0 013 21V9.75z" />
        </svg>
      ),
    },
    {
      href: '/posts/view',
      label: '検索',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
      ),
    },
    {
      href: '/posts/new',
      label: '投稿',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      ),
    },
    {
      href: '/posts/view-all',
      label: 'My Posts',
      requiresAuth: true,
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0z" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 header-bar border-t border-gray-700/60 flex safe-area-bottom">
      {items.map(({ href, label, icon, requiresAuth }) => {
        if (requiresAuth && !user) return null;
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors ${
              active ? 'text-brand' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {icon}
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function Layout({ children, toggleTheme, isDark }) {
  const { user, authReady, signOut } = useAuth();

  return (
    <div className="page-bg flex flex-col">
      <nav className="header-bar flex items-center justify-between px-5 py-3 sticky top-0 z-10">
        <Link href="/" className="brand-link text-lg tracking-tight">Post Share</Link>

        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center rounded-lg
                       text-gray-400 hover:text-gray-200 hover:bg-gray-800
                       transition-colors cursor-pointer"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? '☀' : '🌙'}
          </button>

          {!authReady ? (
            <span className="text-sm text-gray-500">…</span>
          ) : user ? (
            <>
              <span className="text-sm text-gray-400 hidden sm:inline">
                Hi, <span className="text-gray-200 font-medium">{user.username}</span>
              </span>
              <button
                type="button"
                onClick={signOut}
                className="btn btn-outline-light hover-lift focus-ring btn-sm"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login"  className="btn btn-outline-light hover-lift focus-ring btn-sm">Login</Link>
              <Link href="/auth/signup" className="btn-primary btn-sm">Sign Up</Link>
            </>
          )}
        </div>
      </nav>

      {/* pb-20 on mobile so content isn't hidden behind bottom nav */}
      <main className="flex-1 pb-20 md:pb-0">{children}</main>

      <footer className="hidden md:block border-t border-gray-200 dark:border-gray-800 text-center py-3 text-xs text-gray-400 dark:text-gray-600">
        © 2025 Post Share
      </footer>

      <BottomNav user={user} />
    </div>
  );
}
