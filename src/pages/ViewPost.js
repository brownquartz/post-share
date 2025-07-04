// src/pages/ViewPost.js
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import CryptoJS from 'crypto-js';

export default function ViewPost() {
  const { postId } = useParams();
  const [password, setPassword] = useState('');
  const [decryptedContent, setDecryptedContent] = useState('');
  const [error, setError] = useState('');

  const handleView = async () => {
    try {
      const res = await fetch(`/api/posts/${postId}?password=${password}`);
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
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleView}>View</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {decryptedContent && (
        <div
          dangerouslySetInnerHTML={{ __html: decryptedContent }}
        />
      )}
    </div>
  );
}
