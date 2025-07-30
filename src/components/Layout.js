// src/components/Layout.js
import React from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
  const { userId, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-blue-600 text-white p-4 flex justify-between items-center">
        <div className="font-bold text-xl">Post Share</div>
        <div className="flex space-x-4 items-center">
          <Link href="/">
            <a className="hover:underline">Home</a>
          </Link>
          {userId && (
            <>  {/* 認証済みユーザーのみ表示 */}
              <Link href="/create">
                <a className="hover:underline">Create</a>
              </Link>
              <Link href="/view">
                <a className="hover:underline">View</a>
              </Link>
            </>
          )}
          {!userId ? (
            <Link href="/auth/login">
              <a className="px-4 py-2 bg-white text-blue-600 rounded hover:bg-gray-100">Login</a>
            </Link>
          ) : (
            <button
              onClick={logout}
              className="px-4 py-2 bg-white text-blue-600 rounded hover:bg-gray-100"
            >
              Logout
            </button>
          )}
        </div>
      </nav>

      <main className="flex-1 p-6">
        {children}
      </main>

      <footer className="bg-gray-200 text-center p-2 text-sm">
        &copy; 2025 Post Share v0.03
      </footer>
    </div>
  );
}
