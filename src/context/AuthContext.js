// frontend/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('userId');
    if (stored) {
      setUserId(stored);
    }
  }, []);

  const login = (id) => {
    localStorage.setItem('userId', id);
    setUserId(id);
  };

  const logout = () => {
    localStorage.removeItem('userId');
    setUserId(null);
  };

  return (
    <AuthContext.Provider value={{ userId, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);


// frontend/lib/api.js
export async function signup(username, password, passwordConfirm) {
  const res = await fetch('/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, passwordConfirm })
  });
  return res.json();
}

export async function login(username, password) {
  const res = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  return res.json();
}

export async function fetchPosts() {
  const res = await fetch('/api/posts');
  return res.json();
}

export async function createPost(data) {
  const res = await fetch('/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}


// frontend/pages/_app.jsx
import React from 'react';
import { AuthProvider } from '../context/AuthContext';

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}


// frontend/pages/auth/signup.jsx
import React, { useState } from 'react';
import { signup } from '../../lib/api';
import { useRouter } from 'next/router';

export default function Signup() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', password: '', passwordConfirm: '' });
  const [error, setError] = useState(null);

  const onChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  const onSubmit = async (e) => {
    e.preventDefault();
    const data = await signup(form.username, form.password, form.passwordConfirm);
    if (data.status === 'ok') {
      router.push('/auth/login');
    } else {
      setError(data.message);
    }
  };

  return (
    <div className="p-4">
      <h1>Sign Up</h1>
      <form onSubmit={onSubmit}>
        <input name="username" placeholder="Username" value={form.username} onChange={onChange} />
        <input type="password" name="password" placeholder="Password" value={form.password} onChange={onChange} />
        <input type="password" name="passwordConfirm" placeholder="Confirm Password" value={form.passwordConfirm} onChange={onChange} />
        <button type="submit">Sign Up</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}


// frontend/pages/auth/login.jsx
import React, { useState } from 'react';
import { login } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/router';

export default function Login() {
  const router = useRouter();
  const { login: doLogin } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState(null);

  const onChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  const onSubmit = async (e) => {
    e.preventDefault();
    const data = await login(form.username, form.password);
    if (data.status === 'ok') {
      doLogin(data.userId);
      router.push('/');
    } else {
      setError(data.message);
    }
  };

  return (
    <div className="p-4">
      <h1>Login</h1>
      <form onSubmit={onSubmit}>
        <input name="username" placeholder="Username" value={form.username} onChange={onChange} />
        <input type="password" name="password" placeholder="Password" value={form.password} onChange={onChange} />
        <button type="submit">Login</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}


// frontend/pages/index.jsx
import React, { useEffect, useState } from 'react';
import { fetchPosts } from '../lib/api';
import Link from 'next/link';

export default function Home() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    fetchPosts().then(setPosts);
  }, []);

  return (
    <div className="p-4">
      <h1>Posts</h1>
      <Link href="/auth/login">Login</Link> | <Link href="/auth/signup">Sign Up</Link>
      <ul>
        {posts.map(post => (
          <li key={post.id}>
            <Link href={`/posts/${post.id}`}>{post.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
