// src/pages/auth/login.js
import React, { useState } from 'react';
import { login } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/router';

export default function Login() {
  const router = useRouter();
  const { login: doLogin } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState(null);

  const onChange = e => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onSubmit = async e => {
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
        <input
          name="username"
          placeholder="Username"
          value={form.username}
          onChange={onChange}
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={onChange}
        />
        <button type="submit">Login</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
