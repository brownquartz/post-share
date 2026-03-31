// src/lib/api.js

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

export const apiGet = (path) => api(path);
export const apiPost = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body) });
export const apiDelete = (path) => api(path, { method: 'DELETE' });


// ユーザー登録
export async function signup(username, password, passwordConfirm) {
  const res = await fetch(`${API_BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, password, passwordConfirm }),
  });
  return res.json();
}

export async function login(username, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, password }),
  });
  return res.json();
}

export async function me() {
  const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
  return res.json();
}

export async function logout() {
  const res = await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' });
  return res.json();
}

export async function fetchPosts() {
  const res = await fetch(`${API_BASE}/api/posts`, { credentials: 'include' });
  return res.json();
}

export async function createPost(data) {
  const res = await fetch(`${API_BASE}/api/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return res.json();
}