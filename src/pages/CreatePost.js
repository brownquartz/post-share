// src/pages/CreatePost.js
import { useState } from 'react';
import ReactQuill from 'react-quill';
import CryptoJS from 'crypto-js';

function generateRandomId(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < length; i++) {
    s += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return s;
}

export default function CreatePost() {
  const [title, setTitle] = useState('');
  const [accountId, setAccountId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postId, setPostId] = useState('');
  const [expireAt, setExpireAt] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const API_BASE = process.env.REACT_APP_API_BASE

  const handleSubmit = async () => {
    if (!title.trim() || !accountId.trim() || !password.trim() || !postContent.trim()) {
      setStatusMessage('Error: All fields are required.');
      return;
    }
    const newPostId = generateRandomId();
    const key = CryptoJS.SHA256(password).toString();
    const encrypted = CryptoJS.AES.encrypt(postContent, key).toString();

    try {
      const res = await fetch(`${API_BASE}/api/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newPostId,
          title,
          accountId,
          password,
          content: encrypted
        })
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Save failed');

      setPostId(newPostId);
      setExpireAt(body.expireAt);
      const link = `${window.location.origin}${process.env.PUBLIC_URL}/view`;
      setShareLink(link);
      setStatusMessage('Post saved successfully!');
    } catch (err) {
      setStatusMessage(`Error: ${err.message}`);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setStatusMessage('Copied to clipboard');
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Create Post</h1>

      {/* Title */}
      <div>
        <label className="block font-medium mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
      </div>

      {/* Account & Password */}
      <div className="space-y-4">
        <div>
          <label className="block font-medium mb-1">Account ID</label>
          <input
            type="text"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Password</label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
          <label className="inline-flex items-center mt-1">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={() => setShowPassword(!showPassword)}
              className="form-checkbox"
            />
            <span className="ml-2 text-sm">Show password</span>
          </label>
        </div>
      </div>

      {/* Content Editor */}
      <div>
        <label className="block font-medium mb-1">Content</label>
        <div className="border rounded overflow-hidden">
          <ReactQuill
            theme="snow"
            value={postContent}
            onChange={setPostContent}
            modules={{
              toolbar: [
                [{ font: [] }, { size: [] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ color: [] }, { background: [] }],
                [{ list: 'ordered' }, { list: 'bullet' }],
                ['blockquote', 'code-block'],
                [{ align: [] }],
                ['link', 'image'],
                ['clean']
              ]
            }}
            className="h-60"
          />
        </div>
      </div>

      {/* Save Button under editor */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Save
        </button>
      </div>

      {/* Result Info */}
      {postId && (
        <div className="border-t pt-4 space-y-2">
          <p>
            <strong>Post Title:</strong> {title}
          </p>
          {/* <p>
            <strong>Post ID:</strong> {postId}
          </p> */}
          <p>
            <strong>Expires at:</strong> {new Date(expireAt).toLocaleString()}
          </p>
        </div>
      )}

      {/* Share Link */}
      {shareLink && (
        <div className="border-t pt-4">
          <p className="font-medium">Share Link:</p>
          <div className="flex space-x-2 mt-2">
            <input
              type="text"
              readOnly
              value={shareLink}
              className="flex-1 border rounded px-3 py-2"
            />
            <button
              type="button"
              onClick={() => copyToClipboard(shareLink)}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Status */}
      {statusMessage && <p className="text-sm text-gray-700">{statusMessage}</p>}
    </div>
  );
}
