// src/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';

const DEFAULT_API_BASE = process.env.NEXT_PUBLIC_API_BASE;

const AuthContext = createContext({
  user: null,
  authReady: false,
  setUser: () => {},
  refresh: () => {},
  signOut: async () => {},
});

export const AuthProvider = ({ children, apiBase = DEFAULT_API_BASE }) => {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const refresh = async () => {
    try {
      const r = await fetch(`${apiBase}/api/auth/me`, { credentials: 'include' });
      const data = r.ok ? await r.json() : null;
      setUser(data?.user ?? data ?? null);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    (async () => {
      await refresh();
      setAuthReady(true);
    })();
  }, [apiBase]);

  const signOut = async () => {
    try {
      await fetch(`${apiBase}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, authReady, setUser, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
