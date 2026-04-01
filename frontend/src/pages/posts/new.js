// src/pages/posts/new.js
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import CryptoJS from "crypto-js";
import { API_BASE } from "../../lib/apiBase";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from 'next/router';

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

export default function NewPostPage() {
  const { user, authReady } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postId, setpostId] = useState("");
  const [useMyId, setUseMyId] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [viewPolicy, setViewPolicy] = useState("public_password");
  const [editPolicy, setEditPolicy] = useState(user ? "owner" : "password");
  const [deletePolicy, setDeletePolicy] = useState(editPolicy);
  const [commentCreatePolicy, setCommentCreatePolicy] = useState("anyone");
  const [commentModeratePolicy, setCommentModeratePolicy] = useState("owner");
  const [viewPassword, setViewPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    if (viewPolicy === "owner") {
      setEditPolicy("owner"); setDeletePolicy("owner");
      setCommentCreatePolicy("owner"); setCommentModeratePolicy("owner");
    } else if (viewPolicy === "locked") {
      setEditPolicy("none"); setDeletePolicy("owner");
      setCommentCreatePolicy("none"); setCommentModeratePolicy("owner");
    }
  }, [viewPolicy]);

  useEffect(() => { setDeletePolicy(editPolicy); }, [editPolicy]);

  useEffect(() => {
    if (useMyId && user) {
      setpostId(user?.username ?? String(user?.postId ?? ""));
    }
  }, [useMyId, user]);

  useEffect(() => { if (!useMyId) setpostId(""); }, [useMyId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg(""); setLoading(true);
    try {
      if (!postId.trim()) throw new Error("Post ID is required");
      if (!title.trim()) throw new Error("Title is required");
      if (!postContent || postContent.replace(/<[^>]*>/g, '').trim() === '') throw new Error("Content is required");

      const body = { title, postId, viewPolicy, editPolicy, deletePolicy, commentCreatePolicy, commentModeratePolicy };

      if (viewPolicy === "public_password") {
        if (!viewPassword) throw new Error("Password is required");
        const keyHex = CryptoJS.SHA256(viewPassword).toString();
        body.content = CryptoJS.AES.encrypt(postContent, keyHex).toString();
        body.postPassword = keyHex;
        if (typeof window !== "undefined") sessionStorage.setItem(`view:post:${postId}`, keyHex);
      } else {
        body.content = postContent;
      }

      const res = await fetch(`${API_BASE}/api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `Save failed (${res.status})`);
      window.location.href = "/posts/view";
    } catch (err) {
      setErrorMsg(err.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  if (!authReady) return <div className="p-6 text-secondary text-sm">Checking session…</div>;
  if (!user) return (
    <main className="page-wrap-sm text-center">
      <p className="text-secondary mb-4">Please log in to create a post.</p>
      <a href="/auth/login" className="btn-primary">Login</a>
    </main>
  );

  return (
    <main className="page-wrap-md">
      <h1 className="page-title mb-8">Create a Post</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="label">Title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>

        <div>
          <label className="label">Post ID</label>
          <input
            className="input"
            value={postId}
            onChange={(e) => setpostId(e.target.value)}
            placeholder={useMyId ? (authReady && !user ? "Login required" : "Using your ID") : "Enter Post ID"}
            readOnly={useMyId && !!user}
            required
          />
          <label className="mt-2 flex items-center gap-2 text-sm text-secondary cursor-pointer">
            <input type="checkbox" checked={useMyId} onChange={(e) => setUseMyId(e.target.checked)} disabled={authReady && !user} />
            <span>Use my ID</span>
          </label>
        </div>

        <div>
          <label className="label">Visibility</label>
          <div className="flex flex-wrap gap-4">
            <label className="radio-label"><input type="radio" name="viewPolicy" value="public_password" checked={viewPolicy === "public_password"} onChange={() => setViewPolicy("public_password")} /><span>Password required</span></label>
            <label className={user ? "radio-label" : "radio-dim"}><input type="radio" name="viewPolicy" value="owner" disabled={!user} checked={viewPolicy === "owner"} onChange={() => setViewPolicy("owner")} /><span>Owner only</span></label>
            <label className="radio-label"><input type="radio" name="viewPolicy" value="locked" checked={viewPolicy === "locked"} onChange={() => setViewPolicy("locked")} /><span>Locked</span></label>
          </div>
          {viewPolicy === "public_password" && (
            <div className="mt-3">
              <label className="label">Password</label>
              <div className="flex items-center gap-2">
                <input className="input" type={showPw ? "text" : "password"} value={viewPassword} onChange={(e) => setViewPassword(e.target.value)} required={viewPolicy === "public_password"} />
                <label className="text-sm text-secondary flex items-center gap-1 whitespace-nowrap cursor-pointer">
                  <input type="checkbox" checked={showPw} onChange={(e) => setShowPw(e.target.checked)} /> Show
                </label>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="label">Content</label>
          <div className="quill-wrap rich-quill">
            <ReactQuill theme="snow" value={postContent} onChange={setPostContent} />
          </div>
        </div>

        {viewPolicy === "public_password" && (
          <div className="surface p-4 space-y-4">
            <div>
              <label className="label">Edit Policy</label>
              <div className="flex flex-wrap gap-4">
                <label className="radio-label"><input type="radio" name="editPolicy" value="none" checked={editPolicy === "none"} onChange={() => setEditPolicy("none")} /><span>None</span></label>
                <label className={user ? "radio-label" : "radio-dim"}><input type="radio" name="editPolicy" value="owner" disabled={!user} checked={editPolicy === "owner"} onChange={() => setEditPolicy("owner")} /><span>Owner</span></label>
                <label className="radio-label"><input type="radio" name="editPolicy" value="password" checked={editPolicy === "password"} onChange={() => setEditPolicy("password")} /><span>Password holders</span></label>
              </div>
              <p className="text-xs text-muted mt-1">Delete policy mirrors Edit.</p>
            </div>
            <div>
              <label className="label">Who can comment?</label>
              <div className="flex flex-wrap gap-4">
                {["none","anyone"].map(v => (
                  <label key={v} className="radio-label"><input type="radio" name="commentCreatePolicy" value={v} checked={commentCreatePolicy === v} onChange={() => setCommentCreatePolicy(v)} /><span className="capitalize">{v}</span></label>
                ))}
                <label className={user ? "radio-label" : "radio-dim"}><input type="radio" name="commentCreatePolicy" value="owner" disabled={!user} checked={commentCreatePolicy === "owner"} onChange={() => setCommentCreatePolicy("owner")} /><span>Owner</span></label>
              </div>
            </div>
          </div>
        )}

        {errorMsg && <p className="text-error">{errorMsg}</p>}

        <button type="submit" disabled={loading} className="btn-primary disabled:opacity-60">
          {loading ? "Creating…" : "Save Post"}
        </button>
      </form>
    </main>
  );
}
