// src/pages/ViewPost.js
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import CryptoJS from 'crypto-js';

export default function ViewPost() {
  const { postId } = useParams();
  const [accountId, setAccountId] = useState('');
  const [password, setPassword]   = useState('');
  const [content, setContent]     = useState('');
  const [error, setError]         = useState('');

  const API_BASE = process.env.REACT_APP_API_BASE;

  const handleView = async () => {
    try {
      // ① パスワードを SHA256 でハッシュ化
      const hashedPassword = CryptoJS.SHA256(password).toString();

      // ② 認証情報付きで投稿一覧を取得
      const res = await fetch(
        `${API_BASE}/api/posts?accountId=${encodeURIComponent(accountId)}` +
        `&password=${encodeURIComponent(hashedPassword)}`
      );
      if (!res.ok) throw new Error('認証に失敗しました');

      const posts = await res.json();
      // ③ postId に合致するものを探す
      const post = posts.find(p => String(p.id) === postId);
      if (!post) throw new Error('投稿が見つかりません');

      // ④ AES で復号
      const bytes = CryptoJS.AES.decrypt(post.content, hashedPassword);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      setContent(decrypted);
      setError('');
    } catch (e) {
      setError(e.message);
      setContent('');
    }
  };

  return (
    <div>
      <h1>View Post #{postId}</h1>

      <div>
        <label>Account ID:</label>
        <input
          type="text"
          value={accountId}
          onChange={e => setAccountId(e.target.value)}
          className="border p-1"
        />
      </div>

      <div>
        <label>Password:</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="border p-1"
        />
      </div>

      <button onClick={handleView} className="mt-2 px-3 py-1 bg-blue-600 text-white">
        View
      </button>

      {error && <p className="text-red-600 mt-2">{error}</p>}
      {content && (
        <div className="mt-4 prose" dangerouslySetInnerHTML={{ __html: content }} />
      )}
    </div>
  );
}
