// src/components/Layout.js
import React from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
  const { user, authReady, signOut } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="header-bar flex items-center justify-between px-4 py-3">
        <Link href="/" className="brand-link">Post Share</Link>

        {!authReady ? (
          <span className="text-sm text-white/80">…</span>
        ) : user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm">Hi, {user.username}</span>
            <button
              type="button"
              onClick={signOut}
              className="btn btn-solid-brand hover-lift focus-ring cursor-pointer"
              aria-label="Logout"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="btn btn-solid-brand hover-lift focus-ring cursor-pointer">Login</Link>
            <Link href="/auth/signup" className="btn btn-solid-brand hover-lift focus-ring cursor-pointer">Sign Up</Link>
          </div>
        )}
      </nav>

      <main className="flex-1 p-6">{children}</main>

      <footer className="bg-gray-200 text-center p-2 text-sm">
        &copy; 2025 Post Share v0.10
      </footer>
    </div>
  );
}
