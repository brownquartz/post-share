// src/pages/PostsList.js
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import CryptoJS from 'crypto-js';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function PostsList() {
  const query = useQuery();
  const [accountId, setAccountId] = useState(query.get('accountId') || '');
  const [password, setPassword] = useState(query.get('password') || '');
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState('');

  const API_BASE = process.env.REACT_APP_API_BASE

  const fetchPosts = async () => {
    if (!accountId.trim() || !password.trim()) {
      setError('Please enter Account ID and Password.');
      setPosts([]);
      return;
    }
    try {
      const res = await fetch(
        `${API_BASE}/api/posts?accountId=${encodeURIComponent(accountId)}` +
        `&password=${encodeURIComponent(password)}`
      );
      if (!res.ok) throw new Error('Invalid credentials or no posts');
      const data = await res.json();
      setPosts(data);
      setError('');
    } catch (err) {
      setError(err.message);
      setPosts([]);
    }
  };

  const decrypt = (encrypted) => {
    const key = CryptoJS.SHA256(password).toString();
    const bytes = CryptoJS.AES.decrypt(encrypted, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Your Posts</h1>

      <div className="flex space-x-2">
        <input
          type="text"
          placeholder="Account ID"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="flex-1 border rounded px-3 py-2"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="flex-1 border rounded px-3 py-2"
        />
        <button
          onClick={fetchPosts}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Load Posts
        </button>
      </div>

      {error && <p className="text-red-600">{error}</p>}

      <div className="space-y-4">
        {posts.map((post) => (
          <div key={post.id} className="border rounded p-4 shadow-sm">
            <div className="flex items-center mb-2">
              <span className="text-lg font-semibold">{post.title}</span>
              <span className="ml-auto text-sm text-gray-500">
                Expires: {new Date(post.expire_at).toLocaleString()}
              </span>
            </div>
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: decrypt(post.content) }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
