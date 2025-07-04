// src/pages/CreatePost.js
import { useState } from 'react';
import ReactQuill from 'react-quill';
import CryptoJS from 'crypto-js';

export default function CreatePost() {
  const [postId, setPostId]             = useState('');
  const [password, setPassword]         = useState('');
  const [postContent, setPostContent]   = useState('');
  const [shareLink, setShareLink]       = useState('');
  const [statusMessage, setStatusMessage]= useState('');

  const handleSubmit = async () => {
    if (!postId || !password) {
      setStatusMessage('Error: IDとパスワードを入力してください');
      return;
    }
    const key       = CryptoJS.SHA256(password).toString();
    const encrypted = CryptoJS.AES.encrypt(postContent, key).toString();

    try {
      const res = await fetch('/api/posts', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: postId, password, content: encrypted })
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Save failed');

      const link = `${window.location.origin}${process.env.PUBLIC_URL}/view/${postId}`;
      setShareLink(link);
      setStatusMessage(`Saved! ID: ${postId}`);
    } catch (err) {
      setStatusMessage(`Error: ${err.message}`);
    }
  };

  return (
    <div>
      <h1>Create Post</h1>

      {/* ここから追加 */}
      <label className="block mb-2">
        Post ID
        <input
          type="text"
          value={postId}
          onChange={e => setPostId(e.target.value)}
          className="border p-2 w-full"
        />
      </label>
      <label className="block mb-4">
        Password
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="border p-2 w-full"
        />
      </label>
      {/* ここまで追加 */}

      <ReactQuill
        theme="snow"
        value={postContent}
        onChange={setPostContent}
        modules={{
          toolbar: [
            [{ font: [] }, { size: [] }],
            ['bold','italic','underline','strike'],
            [{ color: [] },{ background: [] }],
            [{ list:'ordered' },{ list:'bullet' }],
            ['blockquote','code-block'],
            [{ align: [] }],
            ['link','image'], // emoji は外してもOK
            ['clean']
          ]
        }}
        className="mb-4"
      />

      <button
        onClick={handleSubmit}
        className="px-4 py-2 bg-blue-600 text-white"
      >
        Save to Server
      </button>

      {shareLink && (
        <div className="mt-4">
          <input
            type="text"
            readOnly
            value={shareLink}
            className="border p-2 w-full"
          />
          <button
            onClick={()=>{ navigator.clipboard.writeText(shareLink); setStatusMessage('Link copied'); }}
            className="mt-2 px-4 py-2 bg-blue-600 text-white"
          >
            Copy Link
          </button>
        </div>
      )}

      {statusMessage && <p className="mt-2">{statusMessage}</p>}
    </div>
  );
}
