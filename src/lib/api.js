// src/lib/api.js

// ユーザー登録
export async function signup(username, password, passwordConfirm) {
  const res = await fetch('/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, passwordConfirm })
  });
  return res.json();
}

// ログイン
export async function login(username, password) {
  const res = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  return res.json();
}

// 投稿一覧取得
export async function fetchPosts() {
  const res = await fetch('/api/posts');
  return res.json();
}

// 投稿作成
export async function createPost({ title, content }) {
  const userId = localStorage.getItem('userId');
  const res = await fetch('/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content, accountId: userId })
  });
  return res.json();
}
