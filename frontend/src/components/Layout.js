// src/components/Layout.js
import React from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

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

      <main className="flex-1">{children}</main>

      <footer className="border-t border-gray-200 dark:border-gray-800 text-center py-3 text-xs text-gray-400 dark:text-gray-600">
        © 2025 Post Share
      </footer>
    </div>
  );
}
