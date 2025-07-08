// src/pages/ViewPost.js
import { useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import CryptoJS from 'crypto-js';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function ViewPost() {
  const { postId } = useParams();
  const query      = useQuery();
  const [accountId] = useState(query.get('accountId') || '');
  const [password, setPassword] = useState(query.get('password') || '');
  const [decryptedContent, setDecryptedContent] = useState('');
  const [error, setError] = useState('');

  // const API_BASE = process.env.REACT_APP_API_BASE

  const handleView = async () => {
    try {
      const res = await fetch(
        `/api/posts/${postId}` +
        `?accountId=${encodeURIComponent(accountId)}` +
        `&password=${encodeURIComponent(password)}`
      );
      if (!res.ok) throw new Error('Invalid ID or password');
      const { content: encrypted } = await res.json();
      const key = CryptoJS.SHA256(password).toString();
      const bytes = CryptoJS.AES.decrypt(encrypted, key);
      const html = bytes.toString(CryptoJS.enc.Utf8);
      setDecryptedContent(html);
      setError('');
    } catch (err) {
      setError(err.message);
      setDecryptedContent('');
    }
  };

  return (
    <div>
      <h1>View Post: {postId}</h1>

      <div>
        <label>Account ID (from URL):</label>
        <input type="text" value={accountId} readOnly className="border p-1" />
      </div>

      <div>
        <label>Password:</label>
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="border p-1"
        />
      </div>

      <button onClick={handleView} className="mt-2 px-3 py-1 bg-blue-600 text-white">
        View
      </button>

      {error && <p className="text-red-600 mt-2">{error}</p>}

      {decryptedContent && (
        <div className="mt-4 prose" dangerouslySetInnerHTML={{ __html: decryptedContent }} />
      )}
    </div>
  );
}
