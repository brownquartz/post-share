// src/pages/auth/signup.js
import React, { useState } from 'react';
import { signup } from '../../lib/api';
import { useRouter } from 'next/router';

export default function Signup() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', password: '', passwordConfirm: '' });
  const [error, setError] = useState(null);

  const onChange = e => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onSubmit = async e => {
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
        <input
          type="password"
          name="passwordConfirm"
          placeholder="Confirm Password"
          value={form.passwordConfirm}
          onChange={onChange}
        />
        <button type="submit">Sign Up</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
